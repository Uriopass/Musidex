use chrono::{DateTime, Utc};
use rusqlite::types::ToSqlOutput;
use rusqlite::{Row, ToSql};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::{Debug, Display, Formatter};
use std::hash::{Hash, Hasher};
use std::ops::Deref;

#[derive(Copy, Clone, Hash, PartialEq, Eq, Serialize, Deserialize, Debug)]
#[serde(transparent)]
pub struct MusicID(pub i32);

#[derive(Copy, Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Music {
    pub id: MusicID,
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct Tag {
    pub music_id: MusicID,
    pub key: TagKey,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integer: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vector: Option<Vector>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Vector(Vec<f32>);

#[derive(Serialize)]
pub struct MusidexMetadata {
    pub musics: Vec<MusicID>,
    pub tags: Vec<Tag>,
    pub hash: String,
}

impl Eq for Vector {}
impl Hash for Vector {
    fn hash<H: Hasher>(&self, state: &mut H) {
        for v in &self.0 {
            state.write_u32(v.to_bits());
        }
    }
}

macro_rules! tag_key {
    {
     $($key:ident => $name:literal,)+
    } => {
        #[derive(Clone, Debug, Hash, PartialEq, Eq)]
        pub enum TagKey {
            $($key,)+
            Other(String)
        }

        impl<'a> From<&'a str> for TagKey {
            fn from(v: &'a str) -> TagKey {
                match v {
                    $($name => TagKey::$key,)+
                    s => TagKey::Other(s.to_string()),
                }
            }
        }

        impl<'a> Into<String> for &'a TagKey {
            fn into(self) -> String {
                match self {
                    $(TagKey::$key => ($name).to_string(),)+
                    TagKey::Other(s) => s.clone(),
                }
            }
        }

        impl ToSql for TagKey {
            fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
                match self {
                    $(TagKey::$key => ($name).to_sql(),)+
                    TagKey::Other(s) => s.to_sql(),
                }
            }
       }
    }
}

tag_key! {
    LocalMP3 => "local_mp3",
    LocalWEBM => "local_webm",
    LocalM4A => "local_m4a",
    LocalOGG => "local_ogg",
    YoutubeVideoID => "youtube_video_id",
    YoutubeWorkerTreated => "youtube_worker_treated",
    YoutubeOriginalTitle => "youtube_original_title",
    YoutubePlaylist => "youtube_playlist",
    Title => "title",
    Artist => "artist",
    Thumbnail => "thumbnail",
    Duration => "duration",
}

impl Display for TagKey {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let s: String = self.into();
        std::fmt::Display::fmt(&s, f)
    }
}

impl<'de> Deserialize<'de> for TagKey {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let v = <&str>::deserialize(deserializer)?;
        Ok(v.into())
    }
}

impl Serialize for TagKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s: String = self.into();
        s.serialize(serializer)
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Music {
    fn from(row: &'a Row<'b>) -> Self {
        Music {
            id: MusicID(row.get_unwrap("id")),
        }
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Tag {
    fn from(row: &'a Row<'b>) -> Self {
        Self {
            music_id: MusicID(row.get_unwrap("music_id")),
            key: row.get_unwrap::<_, String>("key").deref().into(),
            text: row.get_unwrap("text"),
            integer: row.get_unwrap("integer"),
            date: row
                .get_unwrap::<_, Option<String>>("date")
                .and_then(|v| DateTime::parse_from_rfc3339(&v).ok().map(Into::into)),
            vector: row
                .get_unwrap::<_, Option<Vec<u8>>>("vector")
                .map(|x| Vector(x.iter().map(|&x| x as f32).collect())),
        }
    }
}
