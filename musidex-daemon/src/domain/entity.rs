use chrono::{DateTime, Utc};
use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
#[serde(transparent)]
pub struct MusicID(pub i32);

#[derive(Copy, Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Music {
    pub id: MusicID,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Tag {
    pub music_id: MusicID,
    pub key: String,

    pub text: Option<String>,
    pub integer: Option<i32>,
    pub date: Option<DateTime<Utc>>,
    pub vector: Option<Vec<f32>>,
}

impl Eq for Tag {}

#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
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

impl<'a, 'b> From<&'a Row<'b>> for Music {
    fn from(row: &'a Row<'b>) -> Self {
        Music {
            id: MusicID(row.get_unwrap("id")),
        }
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Source {
    fn from(row: &'a Row<'b>) -> Self {
        Source {
            music_id: MusicID(row.get_unwrap("music_id")),
            format: row.get_unwrap("format"),
            url: row.get_unwrap("url"),
        }
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Tag {
    fn from(row: &'a Row<'b>) -> Self {
        Self {
            music_id: MusicID(row.get_unwrap("music_id")),
            key: row.get_unwrap("key"),
            text: row.get_unwrap("text"),
            integer: row.get_unwrap("integer"),
            date: row
                .get_unwrap::<_, Option<String>>("date")
                .and_then(|v| DateTime::parse_from_rfc3339(&v).ok().map(Into::into)),
            vector: row
                .get_unwrap::<_, Option<Vec<u8>>>("vector")
                .map(|x| x.iter().map(|&x| x as f32).collect()),
        }
    }
}
