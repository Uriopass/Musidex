use crate::domain::entity::{MusicID, Source};
use anyhow::{Context, Result};
use rusqlite::Connection;

pub fn insert_source(c: &Connection, source: Source) -> Result<()> {
    log::info!(
        "inserting source {}:{}:{}",
        source.music_id.0,
        source.format,
        source.url
    );

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

pub fn has_source(c: &Connection, id: MusicID, format: String) -> Result<bool> {
    let mut stmt =
        c.prepare_cached("SELECT count(1) FROM sources WHERE music_id=$1 AND format=$2;")?;
    let v: i32 = stmt.query_row(rusqlite::params![id.0, format], |row| row.get(0))?;
    Ok(v == 1)
}
