use crate::domain::entity::{MusicID, Source, Tag};
use crate::domain::{source, tags};
use crate::infrastructure::db::Db;
use crate::infrastructure::youtube_dl::{ytdl_run_with_args, SingleVideo, YoutubeDlOutput};
use anyhow::{Context, Result};
use rusqlite::Connection;
use std::convert::TryInto;
use std::time::Duration;

pub struct YoutubeDLWorker {
    db: Db,
}

impl YoutubeDLWorker {
    pub fn new(db: Db) -> Self {
        YoutubeDLWorker { db }
    }

    pub fn start(mut self) {
        let _ = tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(2)).await;
                let v = self.step().await;
                if let Err(e) = v {
                    log::error!("error while running youtubedl worker: {:?}", e);
                }
            }
        });
    }

    pub async fn step(&mut self) -> Result<()> {
        let mut c = self.db.get().await;
        let candidates = Self::find_candidates(&c)?;

        for cand in candidates {
            Self::youtube_dl_work(&mut c, cand).await?;
        }
        Ok(())
    }

    pub async fn youtube_dl_work(c: &mut Connection, (id, url): (MusicID, String)) -> Result<()> {
        log::info!("{}", url);
        let metadata = download(&url).await?;
        log::info!("downloaded metadata");

        let tx = c.transaction()?;
        source::insert_source(
            &tx,
            Source {
                music_id: id,
                format: s!("youtube_video_id"),
                url: metadata.id.clone(),
            },
        )?;
        let ext = metadata.ext.context("no extension")?;
        source::insert_source(
            &tx,
            Source {
                music_id: id,
                format: format!("local_{}", ext),
                url: format!("{}.{}", metadata.id, ext),
            },
        )?;

        let txb = &tx;
        let add_tag = move |key, value| tags::insert_tag(txb, Tag::new_text(id, key, value));

        let add_tag_opt = move |key, value| {
            if let Some(v) = value {
                return tags::insert_tag(txb, Tag::new_text(id, key, v));
            }
            Ok(())
        };

        add_tag(s!("title"), metadata.title)?;
        add_tag_opt(s!("thumbnail"), metadata.thumbnail_filename)?;
        if let Some(v) = metadata.duration.and_then(|x| x.as_i64()) {
            tags::insert_tag(
                txb,
                Tag {
                    music_id: id,
                    key: s!("duration"),
                    text: Some(v.to_string()),
                    integer: v.try_into().ok(),
                    date: None,
                    vector: None,
                },
            )?;
        }

        tx.commit()?;
        log::info!("success downloaded {}", url);
        Ok(())
    }

    pub fn find_candidates(c: &Connection) -> Result<Vec<(MusicID, String)>> {
        let mut stmt = c.prepare_cached("SELECT * FROM tags WHERE key='youtube_url';")?;
        let tags = stmt.query_map([], |row| Ok(Into::into(row)))?;
        let mut v = vec![];
        for tag in tags {
            let tag: Tag = tag?;
            if source::has_source(c, tag.music_id, s!("youtube_video_id"))? {
                continue;
            }
            v.push((tag.music_id, unwrap_cont!(tag.text)))
        }
        Ok(v)
    }
}

pub async fn download(url: &str) -> Result<SingleVideo> {
    let metadata = ytdl_run_with_args(vec![
        "-o",
        "storage/%(id)s.%(ext)s",
        "-f",
        "bestaudio",
        "--no-playlist",
        "--write-thumbnail",
        "--no-progress",
        "--print-json",
        url,
    ])
    .await?;

    match metadata {
        YoutubeDlOutput::Playlist(_) => {
            bail!("shouldn't be able to happen")
        }
        YoutubeDlOutput::SingleVideo(mut v) => {
            if v.thumbnail.is_some() {
                let _ = tokio::fs::rename(
                    format!("storage/{}.jpg", v.id),
                    format!("storage/{}.webp", v.id),
                )
                .await;
                v.thumbnail_filename = Some(format!("{}.webp", v.id));
            }
            return Ok(v);
        }
    }
}
