use chrono::{DateTime, Utc};
use deadpool_postgres::tokio_postgres::Row;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(transparent)]
pub struct MusicID(i32);

#[derive(Serialize, Deserialize)]
pub struct Music {
    pub id: MusicID,
}

#[derive(Serialize, Deserialize)]
pub struct Tag {
    pub music_id: MusicID,
    pub key: String,

    pub text: Option<String>,
    pub integer: Option<i64>,
    pub date: Option<DateTime<Utc>>,
    pub vector: Option<Vec<f32>>,
}

#[derive(Serialize, Deserialize)]
pub struct Source {
    pub music_id: MusicID,
    pub format: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct MusidexMetadata {
    pub musics: Vec<Music>,
    pub tags: Vec<Tag>,
    pub sources: Vec<Source>,
}

impl From<Row> for Music {
    fn from(row: Row) -> Self {
        Music {
            id: MusicID(row.get("id")),
        }
    }
}

impl From<Row> for Source {
    fn from(row: Row) -> Self {
        Source {
            music_id: MusicID(row.get("music_id")),
            format: row.get("format"),
            url: row.get("url"),
        }
    }
}

impl From<Row> for Tag {
    fn from(row: Row) -> Self {
        Self {
            music_id: MusicID(row.get("music_id")),
            key: row.get("key"),
            text: row.get("text"),
            integer: row.get("integer"),
            date: row
                .get::<_, Option<String>>("date")
                .and_then(|x| DateTime::parse_from_rfc3339(&*x).ok().map(Into::into)),
            vector: row.get("vector"),
        }
    }
}
