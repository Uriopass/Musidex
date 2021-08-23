use crate::domain::entity::Tag;
use crate::domain::{music, tags};
use anyhow::Result;
use hyper::StatusCode;
use rusqlite::Connection;

pub fn youtube_upload(c: &mut Connection, url: String) -> Result<StatusCode> {
    if tags::tags_by_text(&c, &url)?.len() > 0 {
        return Ok(StatusCode::CONFLICT);
    }

    let tx = c.transaction()?;
    let id = music::mk_music(&tx)?;

    tags::insert_tag(&tx, Tag::new_text(id, s!("youtube_url"), url))?;

    tx.commit()?;
    Ok(StatusCode::OK)
}
