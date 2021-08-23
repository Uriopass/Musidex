use crate::domain::entity::MusidexMetadata;
use crate::utils::collect_rows;
use anyhow::Result;
use rusqlite::Connection;

pub fn fetch_metadata(c: &Connection) -> Result<MusidexMetadata> {
    let mut musics = c.prepare_cached("SELECT * FROM musics")?;
    let mut tags = c.prepare_cached("SELECT * FROM tags")?;

    let musics = musics.query_map([], |r| Ok(Into::into(r)))?;
    let tags = tags.query_map([], |r| Ok(Into::into(r)))?;

    Ok(MusidexMetadata {
        musics: collect_rows(musics)?,
        tags: collect_rows(tags)?,
    })
}
