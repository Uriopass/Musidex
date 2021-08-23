use crate::domain::entity::{Music, Tag, TagKey};
use crate::infrastructure::youtube_dl::{ytdl_run_with_args, YoutubeDlOutput};
use anyhow::Result;
use hyper::StatusCode;
use rusqlite::Connection;

pub fn youtube_upload(c: &mut Connection, url: String) -> Result<StatusCode> {
    if Tag::by_text(&c, &url)?.len() > 0 {
        return Ok(StatusCode::CONFLICT);
    }

    let tx = c.transaction()?;
    let id = Music::mk(&tx)?;

    Tag::insert(&tx, Tag::new_text(id, TagKey::YoutubeURL, url))?;

    tx.commit()?;
    Ok(StatusCode::OK)
}

pub async fn youtube_upload_playlist(c: &mut Connection, url: String) -> Result<StatusCode> {
    let metadata =
        ytdl_run_with_args(vec!["--flat-playlist", "--yes-playlist", "-J", &url]).await?;

    let tx = c.transaction()?;
    match metadata {
        YoutubeDlOutput::Playlist(p) => {
            for entry in p.entries.into_iter().flatten() {
                let url = unwrap_cont!(entry.url);
                let title = entry.title;

                let id = Music::mk(&tx)?;
                Tag::insert(&tx, Tag::new_text(id, TagKey::YoutubeURL, url))?;
                Tag::insert(&tx, Tag::new_text(id, TagKey::Title, title))?;
            }
        }
        YoutubeDlOutput::SingleVideo(_) => {
            return Ok(StatusCode::BAD_REQUEST);
        }
    }

    tx.commit()?;
    Ok(StatusCode::OK)
}
