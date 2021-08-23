use crate::domain::entity::{Music, Tag, TagKey};
use crate::infrastructure::youtube_dl::{ytdl_run_with_args, SingleVideo, YoutubeDlOutput};
use anyhow::{Context, Result};
use hyper::StatusCode;
use rusqlite::Connection;

pub async fn youtube_upload(c: &mut Connection, url: String) -> Result<StatusCode> {
    if Tag::by_text(&c, &url)?.len() > 0 {
        return Ok(StatusCode::CONFLICT);
    }

    let metadata = ytdl_run_with_args(vec!["--no-playlist", "-J", &url]).await?;
    let v = match metadata {
        YoutubeDlOutput::Playlist(_) => return Ok(StatusCode::BAD_REQUEST),
        YoutubeDlOutput::SingleVideo(v) => v,
    };
    if id_exists(c, &v.id)? {
        return Ok(StatusCode::CONFLICT);
    }
    let tx = c.transaction()?;
    push_for_treatment(&tx, v)?;
    tx.commit()?;
    Ok(StatusCode::OK)
}

fn id_exists(c: &Connection, id: &str) -> Result<bool> {
    Ok(Tag::by_text(c, id)?
        .into_iter()
        .any(|t| t.key == TagKey::YoutubeVideoID && t.text.as_deref() == Some(id)))
}

fn push_for_treatment(c: &Connection, v: SingleVideo) -> Result<()> {
    let id = Music::mk(&c)?;

    Tag::insert(
        &c,
        Tag::new_text(id, TagKey::YoutubeURL, v.url.context("no url")?),
    )?;
    Tag::insert(&c, Tag::new_text(id, TagKey::YoutubeVideoID, v.id))?;
    Tag::insert(
        &c,
        Tag::new_text(id, TagKey::YoutubeWorkerTreated, s!("false")),
    )?;
    Tag::insert(&c, Tag::new_text(id, TagKey::Title, v.title))?;
    Ok(())
}

pub async fn youtube_upload_playlist(c: &mut Connection, url: String) -> Result<StatusCode> {
    let metadata =
        ytdl_run_with_args(vec!["--flat-playlist", "--yes-playlist", "-J", &url]).await?;

    match metadata {
        YoutubeDlOutput::Playlist(p) => {
            for entry in p.entries.into_iter().flatten() {
                if entry.url.is_none() {
                    continue;
                }
                if id_exists(c, &entry.id)? {
                    continue;
                }
                let tx = c.transaction()?;
                push_for_treatment(&tx, entry)?;
                tx.commit()?;
            }
        }
        YoutubeDlOutput::SingleVideo(_) => {
            return Ok(StatusCode::BAD_REQUEST);
        }
    }

    Ok(StatusCode::OK)
}
