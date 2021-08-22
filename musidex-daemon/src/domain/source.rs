use crate::domain::entity::Source;
use anyhow::{Context, Result};
use rusqlite::Connection;

pub fn insert_source(c: &Connection, source: Source) -> Result<()> {
    let v = c
        .prepare_cached(
            "
            INSERT INTO sources (music_id, format, url)
            VALUES ($1, $2, $3)
            ON CONFLICT (music_id, format)
            DO UPDATE SET url=$3;",
        )?
        .execute(rusqlite::params![
            source.music_id.0,
            source.format,
            source.url
        ])
        .context("error inserting source")?;
    if v == 0 {
        bail!("no row updated")
    }
    Ok(())
}
