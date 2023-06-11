use crate::domain::entity::{Music, MusicID, Tag, TagKey, UserID};
use anyhow::{Context, Result};
use hyper::StatusCode;
use rusqlite::Connection;

impl Music {
    pub fn mk(c: &Connection) -> Result<MusicID> {
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

    pub fn delete(c: &Connection, id: MusicID) -> Result<bool> {
        log::info!("deleting music {:?} from db", id);
        c.prepare_cached("DELETE FROM musics WHERE id=?1;")
            .context("error preparing delete music")?
            .execute([&id.0])
            .context("error executing delete music")
            .map(|x| x == 1)
    }

    pub fn merge(c: &mut Connection, id1: MusicID, id2: MusicID) -> Result<()> {
        let t = c.transaction().context("transaction begin failed")?;

        t.prepare_cached("UPDATE OR IGNORE tags SET music_id = ?1 WHERE music_id = ?2;")
            .context("error preparing merge music")?
            .execute([&id1.0, &id2.0])
            .context("error executing merge music")?;

        Music::delete(&t, id2)?;

        t.commit().context("transaction commit failed")?;

        Ok(())
    }

    pub fn put_on_top(c: &mut Connection, id: MusicID) -> Result<bool> {
        let t = c.transaction().context("transaction begin failed")?;

        let m = Music::mk(&t)?;

        t.prepare_cached("UPDATE tags SET music_id = ?1 WHERE music_id = ?2;")
            .context("error preparing put on top music")?
            .execute([&m.0, &id.0])
            .context("error executing put on top music")?;

        let song_exists = Music::delete(&t, id)?;

        t.commit().context("transaction commit failed")?;

        Ok(song_exists)
    }
}

pub fn delete_music(c: &Connection, uid: UserID, id: MusicID) -> Result<StatusCode> {
    let tags = Tag::by_id(&c, id)?;
    let owners: Vec<_> = tags
        .iter()
        .filter_map(|x| x.key.as_user_library())
        .collect();
    let mut removed_owner = false;
    if owners.contains(&&*uid.to_string()) {
        Tag::remove(&c, id, TagKey::UserLibrary(uid.to_string()))?;
        removed_owner = true;
    } else if owners.len() >= 1 {
        return Ok(StatusCode::UNAUTHORIZED);
    }

    if owners.len() == 0 || (owners.len() == 1 && removed_owner) {
        Music::delete(&c, id).context("couldn't delete music from db")?;
    }

    Ok(StatusCode::OK)
}
