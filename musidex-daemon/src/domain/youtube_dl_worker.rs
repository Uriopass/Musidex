use crate::domain::entity::{MusicID, Tag, TagKey};
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
        let c = self.db.get().await;
        let candidates = Self::find_candidates(&c)?;

        for cand in candidates {
            Self::youtube_dl_work(&self.db, cand).await?;
        }
        Ok(())
    }

    pub async fn youtube_dl_work(db: &Db, (id, url): (MusicID, String)) -> Result<()> {
        log::info!("{}", url);
        let metadata = download(&url).await?;
        log::info!("downloaded metadata");

        let mut c = db.get().await;
        let tx = c.transaction()?;

        let txb = &tx;
        let add_tag = move |key, value| Tag::insert(txb, Tag::new_text(id, key, value));

        let add_tag_opt = |key, value| {
            if let Some(v) = value {
                return add_tag(key, v);
            }
            Ok(())
        };

        let ext = metadata.ext.context("no extension")?;
        add_tag(
            TagKey::Other(format!("local_{}", ext)),
            format!("{}.{}", metadata.id, ext),
        )?;
        add_tag_opt(TagKey::Thumbnail, metadata.thumbnail_filename)?;
        add_tag(TagKey::YoutubeWorkerTreated, s!("true"))?;

        if let Some(v) = metadata.duration.and_then(|x| x.as_i64()) {
            Tag::insert(
                txb,
                Tag {
                    music_id: id,
                    key: TagKey::Duration,
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
        let mut v = vec![];
        for tag in Tag::by_key(c, TagKey::YoutubeWorkerTreated)? {
            if tag.text.as_deref().unwrap_or("") != "false" {
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
