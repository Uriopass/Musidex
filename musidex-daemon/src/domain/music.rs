use crate::domain::entity::MusicID;
use anyhow::{Context, Result};
use rusqlite::Connection;

pub fn mk_music(c: &Connection) -> Result<MusicID> {
    let stmt = c
        .prepare_cached("INSERT INTO musics DEFAULT VALUES;")
        .context("error preparing mk music")?
        .execute([])?;
    if stmt == 0 {
        bail!("could not create music");
    }

    let mut stmt = c.prepare_cached("SELECT id FROM musics WHERE rowid=last_insert_rowid()")?;
    let id = stmt.query_row([], |v| v.get("id"))?;
    Ok(MusicID(id))
}

#[allow(dead_code)]
pub fn delete_music(c: &Connection, id: MusicID) -> Result<bool> {
    c.prepare_cached("DELETE FROM musics WHERE id=$1;")
        .context("error preparing delete music")?
        .execute([&id.0])
        .context("error executing delete music")
        .map(|x| x == 1)
}
