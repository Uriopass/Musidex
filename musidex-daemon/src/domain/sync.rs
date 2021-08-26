use crate::domain::entity::{Music, MusidexMetadata};
use crate::utils::collect_rows;
use anyhow::Result;
use rusqlite::Connection;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub fn fetch_metadata(c: &Connection) -> Result<MusidexMetadata> {
    let mut musics = c.prepare_cached("SELECT * FROM musics")?;
    let mut tags = c.prepare_cached("SELECT * FROM tags")?;

    let musics = musics.query_map([], |r| Ok(Into::into(r)))?;
    let tags = tags.query_map([], |r| Ok(Into::into(r)))?;

    let musics = collect_rows(musics.map(|x| x.map(|v: Music| v.id)))?;
    let tags = collect_rows(tags)?;

    let mut s = DefaultHasher::new();
    (&musics, &tags).hash(&mut s);

    Ok(MusidexMetadata {
        musics,
        tags,
        hash: s.finish().to_string(),
    })
}
