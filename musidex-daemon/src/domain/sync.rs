use crate::domain::entity::{Music, MusidexMetadata};
use crate::utils::collect_rows;
use anyhow::Result;
use rusqlite::Connection;

pub fn fetch_metadata(c: &Connection) -> Result<MusidexMetadata> {
    let mut musics = c.prepare_cached("SELECT * FROM musics")?;
    let mut tags = c.prepare_cached("SELECT * FROM tags")?;

    let musics = musics.query_map([], |r| Ok(Into::into(r)))?;
    let tags = tags.query_map([], |r| Ok(Into::into(r)))?;

    Ok(MusidexMetadata {
        musics: collect_rows(musics.map(|x| x.map(|v: Music| v.id)))?,
        tags: collect_rows(tags)?,
    })
}
