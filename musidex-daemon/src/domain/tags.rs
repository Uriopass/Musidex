use crate::domain::entity::{MusicID, Tag, TagKey};
use crate::utils::collect_rows;
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
    pub fn new_parse(id: MusicID, key: TagKey, value: String) -> Tag {
        let integer = value.parse().ok();
        let mut date = dateparser::parse(&*value).ok();
        if let Some(v) = integer {
            if v < 2100 && v > 1000 {
                date = Some(DateTime::from_utc(
                    NaiveDateTime::new(NaiveDate::from_ymd(v, 1, 2), NaiveTime::from_hms(0, 0, 0)),
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
            INSERT INTO tags (music_id, key, text, integer, date)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT (music_id, key)
            DO UPDATE SET text=?3, integer=?4, date=?5;",
        )?;
        let v = stmt
            .execute(rusqlite::params![
                tag.music_id.0,
                tag.key,
                tag.text,
                tag.integer,
                tag.date,
            ])
            .context("error inserting tag")?;
        if v == 0 {
            bail!("no row updated")
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
            WHERE key=?1;",
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
        match stmt.query_row(rusqlite::params![&id.0, key], |row| Ok(Tag::from(row))) {
            Ok(x) => Ok(Some(x)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e).context("error getting tag by id key"),
        }
    }

    pub fn has(c: &Connection, id: MusicID, key: TagKey) -> Result<bool> {
        let mut stmt =
            c.prepare_cached("SELECT count(1) FROM tags WHERE music_id=?1 AND key=?2;")?;
        let v: i32 = stmt.query_row(rusqlite::params![id.0, key], |row| row.get(0))?;
        Ok(v == 1)
    }
}
