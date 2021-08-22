use crate::domain::entity::MusicID;
use anyhow::{Context, Result};
use rusqlite::Connection;

pub fn mk_music(c: &Connection) -> Result<MusicID> {
    let mut stmt = c.prepare_cached("INSERT INTO music DEFAULT VALUES RETURNING id;")?;
    let mut v = stmt.query([])?;
    let v = v.next()?.context("failed inserting")?;
    let id = v.get("id").unwrap();
    Ok(MusicID(id))
}
