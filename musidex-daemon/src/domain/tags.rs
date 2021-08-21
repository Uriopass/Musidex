use crate::domain::entity::{MusicID, Tag};
use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use tokio_postgres::Client;

pub async fn insert_tag(c: &Client, tag: Tag) -> Result<()> {
    let v = c
        .execute(
            "
            INSERT INTO mtag (music_id, key, text, integer, date)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (music_id, key)
            DO UPDATE SET text=$3, integer=$4, date=$5;",
            &[
                &tag.music_id.0,
                &tag.key,
                &tag.text,
                &tag.integer,
                &tag.date,
            ],
        )
        .await;
    let v = v.context("error inserting tag")?;
    if v == 0 {
        bail!("no row updated")
    }
    Ok(())
}

pub async fn tags_by_text(c: &Client, text: &str) -> Result<Vec<Tag>> {
    let v = c
        .query(
            "
            SELECT * FROM mtag
            WHERE text=$1;",
            &[&text],
        )
        .await?;
    Ok(v.into_iter().map(|row| Tag::from(row)).collect())
}

impl Tag {
    pub fn new_text(id: MusicID, key: String, value: String) -> Tag {
        Tag {
            music_id: id,
            key,
            text: Some(value),
            integer: None,
            date: None,
            vector: None,
        }
    }

    pub fn new_parse(id: MusicID, key: String, value: String) -> Tag {
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
            date,
            vector: None,
        }
    }
}
