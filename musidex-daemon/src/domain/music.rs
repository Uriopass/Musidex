use crate::domain::entity::{Music, MusicID, Tag, TagKey, UserID};
use anyhow::{Context, Result};
use hyper::StatusCode;
use rusqlite::Connection;
use std::collections::HashMap;

pub enum MoveDirection {
    Above,
    Below,
}

impl MoveDirection {
    pub fn offset(&self) -> i64 {
        match self {
            MoveDirection::Above => 1,
            MoveDirection::Below => -1,
        }
    }
}

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

    pub fn move_(
        c: &mut Connection,
        library: &TagKey,
        id_base: MusicID,
        id_to_move: MusicID,
        direction: MoveDirection,
    ) -> Result<bool> {
        let t = c.transaction().context("transaction begin failed")?;

        let order_taken = Tag::by_key(&t, library)?;

        let order_taken: HashMap<_, _> = order_taken
            .into_iter()
            .map(|v| (v.integer.unwrap_or(0), v.music_id))
            .collect();

        let Some(Tag {
            integer: Some(order_base),
            ..
        }) = Tag::by_id_key(&t, id_base, library)?
        else {
            log::error!("couldn't find order for id_bottom");
            return Ok(false);
        };

        let mut to_move = order_base + direction.offset();

        while let Some(mid_to_move) = order_taken.get(&to_move) {
            Tag::insert_silent(
                &t,
                Tag::new_integer(*mid_to_move, library.clone(), to_move + direction.offset()),
            )
            .context("error inserting tag for min insertion")?;
            to_move += direction.offset();
        }

        Tag::insert_silent(
            &t,
            Tag::new_integer(id_to_move, library.clone(), order_base + direction.offset()),
        )?;

        t.commit().context("transaction commit failed")?;
        Ok(true)
    }
}

pub fn delete_music(c: &Connection, uid: UserID, id: MusicID) -> Result<StatusCode> {
    let tags = Tag::by_id(&c, id)?;
    let owners: Vec<_> = tags
        .iter()
        .filter_map(|x| x.key.as_user_library())
        .collect();
    // Check even if there is only one user as when the "all user" filter is off in app then user is "-1"
    if !owners.contains(&&*uid.to_string()) {
        return Ok(StatusCode::FORBIDDEN);
    }
    match owners.len() {
        1 | 0 => {
            Music::delete(&c, id).context("couldn't delete music from db")?;
        }
        _ => {
            Tag::remove(&c, id, &TagKey::UserLibrary(uid.to_string()))?;
        }
    };

    Ok(StatusCode::OK)
}
