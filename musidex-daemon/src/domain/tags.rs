use crate::domain::entity::{MusicID, Tag, TagKey, Vector};
use crate::utils::{collect_rows, row_missing_opt};
use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use rusqlite::Connection;

impl Tag {
    pub fn new_key(id: MusicID, key: TagKey) -> Tag {
        Tag {
            music_id: id,
            key,
            text: None,
            integer: None,
            date: None,
            vector: None,
        }
    }

    pub fn new_text(id: MusicID, key: TagKey, value: String) -> Tag {
        Tag {
            music_id: id,
            key,
            text: Some(value),
            integer: None,
            date: None,
            vector: None,
        }
    }

    #[allow(dead_code)]
    pub fn new_vector(id: MusicID, key: TagKey, value: Vector) -> Tag {
        Tag {
            music_id: id,
            key,
            text: None,
            integer: None,
            date: None,
            vector: Some(value),
        }
    }

    #[allow(dead_code)]
    pub fn new_parse(id: MusicID, key: TagKey, value: String) -> Tag {
        let integer = value.parse().ok();
        let mut date = dateparser::parse(&*value).ok();
        if let Some(v) = integer {
            if v < 2100 && v > 1000 {
                date = Some(DateTime::from_naive_utc_and_offset(
                    NaiveDateTime::new(
                        NaiveDate::from_ymd_opt(v, 1, 2).unwrap(),
                        NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
                    ),
                    Utc,
                ))
            }
        }
        Tag {
            music_id: id,
            key,
            text: Some(value),
            integer,
            date: date.map(|x| x.to_rfc3339()),
            vector: None,
        }
    }

    pub fn insert(c: &Connection, tag: Tag) -> Result<()> {
        log::info!(
            "inserting tag {}:{}:{}",
            tag.music_id.0,
            &tag.key,
            tag.text.as_deref().unwrap_or("None")
        );
        let mut stmt = c.prepare_cached(
            "
            INSERT INTO tags (music_id, key, text, integer, date, vector)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT (music_id, key)
            DO UPDATE SET text=?3, integer=?4, date=?5, vector=?6;",
        )?;
        let v = stmt
            .execute(rusqlite::params![
                tag.music_id.0,
                tag.key,
                tag.text,
                tag.integer,
                tag.date,
                tag.vector,
            ])
            .context("error inserting tag")?;
        if v == 0 {
            bail!("no row updated")
        }
        Ok(())
    }

    pub fn insert_silent(c: &Connection, tag: Tag) -> Result<()> {
        let mut stmt = c.prepare_cached(
            "
            INSERT INTO tags (music_id, key, text, integer, date, vector)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT (music_id, key)
            DO UPDATE SET text=?3, integer=?4, date=?5, vector=?6;",
        )?;
        let v = stmt
            .execute(rusqlite::params![
                tag.music_id.0,
                tag.key,
                tag.text,
                tag.integer,
                tag.date,
                tag.vector,
            ])
            .context("error inserting tag")?;
        if v == 0 {
            bail!("no row updated")
        }
        Ok(())
    }

    pub fn remove(c: &Connection, id: MusicID, key: TagKey) -> Result<()> {
        log::info!("removing tag {} {}", id.0, &key);
        let mut stmt = c.prepare_cached("DELETE FROM tags WHERE music_id=?1 AND key=?2;")?;
        let v = stmt
            .execute(rusqlite::params![id.0, key])
            .context("error deleting tag")?;
        if v == 0 {
            log::warn!("removing tag {} {} but it didn't exist", id.0, &key);
        }
        Ok(())
    }

    pub fn by_text(c: &Connection, text: &str) -> Result<Vec<Tag>> {
        let mut stmt = c.prepare_cached(
            "
            SELECT * FROM tags
            WHERE text=?1;",
        )?;
        let v = stmt.query_map([&text], |row| Ok(Tag::from(row)))?;
        collect_rows(v)
    }

    pub fn by_id(c: &Connection, id: MusicID) -> Result<Vec<Tag>> {
        let mut stmt = c.prepare_cached(
            "
            SELECT * FROM tags
            WHERE music_id=?1;",
        )?;
        let v = stmt.query_map([&id.0], |row| Ok(Tag::from(row)))?;
        collect_rows(v)
    }

    pub fn by_key(c: &Connection, key: TagKey) -> Result<Vec<Tag>> {
        let mut stmt = c.prepare_cached(
            "
            SELECT * FROM tags
            WHERE key=?1
            ORDER BY music_id DESC;",
        )?;
        let v = stmt.query_map([&key], |row| Ok(Tag::from(row)))?;
        collect_rows(v)
    }

    pub fn by_id_key(c: &Connection, id: MusicID, key: TagKey) -> Result<Option<Tag>> {
        let mut stmt = c.prepare_cached(
            "
            SELECT * FROM tags
            WHERE music_id=?1 AND key=?2;",
        )?;
        row_missing_opt(stmt.query_row(rusqlite::params![&id.0, key], |row| {
            Ok(Some(Tag::from(row)))
        }))
        .context("error getting tag by id key")
    }

    pub fn has(c: &Connection, id: MusicID, key: TagKey) -> Result<bool> {
        let mut stmt =
            c.prepare_cached("SELECT count(1) FROM tags WHERE music_id=?1 AND key=?2;")?;
        let v: i32 = stmt.query_row(rusqlite::params![id.0, key], |row| row.get(0))?;
        Ok(v == 1)
    }
}
