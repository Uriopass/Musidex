use std::convert::TryFrom;
use std::fmt::{Debug, Display, Formatter};
use std::hash::{Hash, Hasher};
use std::ops::Deref;

use nanoserde::{DeJson, DeJsonErr, DeJsonState, SerJson, SerJsonState};
use rusqlite::types::ToSqlOutput;
use rusqlite::{Row, ToSql};
use std::str::Chars;

#[derive(Copy, Clone, Hash, PartialEq, Eq, SerJson, DeJson, Debug)]
#[nserde(transparent)]
pub struct MusicID(pub i32);

#[derive(Copy, Clone, Hash, PartialEq, Eq, SerJson, DeJson, Debug)]
#[nserde(transparent)]
pub struct UserID(pub i32);

#[derive(Clone, Debug, Hash, PartialEq, Eq, SerJson, DeJson)]
pub struct User {
    pub id: UserID,
    pub name: String,
}

#[derive(Copy, Clone, PartialEq, Eq, Debug, SerJson, DeJson)]
pub struct Music {
    pub id: MusicID,
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, SerJson, DeJson)]
pub struct Tag {
    pub music_id: MusicID,
    pub key: TagKey,

    pub text: Option<String>,
    pub integer: Option<i32>,
    pub date: Option<String>,
    pub vector: Option<Vector>,
}

#[derive(SerJson, DeJson)]
#[nserde(transparent)]
pub struct DateSerde(Option<String>);

#[derive(Clone, Debug, PartialEq, SerJson, DeJson)]
#[nserde(transparent)]
pub struct Vector(Vec<f32>);

#[derive(Clone, Debug, Hash, PartialEq, SerJson, DeJson)]
pub struct Patch {
    pub kind: String,
    pub tag: Tag,
}

#[derive(SerJson, Hash, Default)]
pub struct MusidexMetadata {
    pub musics: Vec<MusicID>,
    pub tags: Option<Vec<Tag>>,
    pub users: Vec<User>,
    pub settings: Vec<(String, String)>,
    pub patches: Option<Vec<Patch>>,
}

impl Eq for Vector {}
impl Hash for Vector {
    fn hash<H: Hasher>(&self, state: &mut H) {
        for v in &self.0 {
            state.write_u32(v.to_bits());
        }
    }
}

fn parse_split(x: &str) -> Option<(&str, &str)> {
    let v = x.find(':')?;
    Some((&x[..v], &x.get(v + 1..)?))
}

macro_rules! tag_key {
    {
     $($key:ident => $name:literal,)+;
     $(nested $nest_key:ident => $nest_name:literal,)*
    } => {
        #[derive(Clone, Debug, Hash, PartialEq, Eq)]
        pub enum TagKey {
            $($key,)+
            $($nest_key(String),)+
            Other(String)
        }

        impl<'a> From<&'a str> for TagKey {
            fn from(v: &'a str) -> TagKey {
                match v {
                    $($name => TagKey::$key,)+
                    s => {
                        if let Some((prefix, val)) = parse_split(s) {
                            match prefix {
                                $($nest_name => return TagKey::$nest_key(val.to_string()),)+
                                _ => TagKey::Other(s.to_string())
                            }
                        } else {
                            TagKey::Other(s.to_string())
                        }
                    },
                }
            }
        }

        impl<'a> Into<String> for &'a TagKey {
            fn into(self) -> String {
                match self {
                    $(TagKey::$key => ($name).to_string(),)+
                    $(TagKey::$nest_key(s) => format!(concat!($nest_name, ":{}"), s),)+
                    TagKey::Other(s) => s.clone(),
                }
            }
        }

        impl ToSql for TagKey {
            fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
                match self {
                    $(TagKey::$key => ($name).to_sql(),)+
                    $(TagKey::$nest_key(s) => Ok(ToSqlOutput::Owned(rusqlite::types::Value::Text(format!(concat!($nest_name, ":{}"), s)))),)+
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
    YoutubeDLURL => "youtubedl_url",
    YoutubeDLVideoID => "youtube_video_id",
    YoutubeDLWorkerTreated => "youtube_worker_treated",
    YoutubeDLOriginalTitle => "youtube_original_title",
    YoutubeDLPlaylist => "youtube_playlist",
    Title => "title",
    Artist => "artist",
    CompressedThumbnail => "compressed_thumbnail",
    Thumbnail => "thumbnail",
    Duration => "duration",
    Embedding => "embedding",
    ;
    nested UserLibrary => "user_library",
}

impl Display for TagKey {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let s: String = self.into();
        std::fmt::Display::fmt(&s, f)
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Music {
    fn from(row: &'a Row<'b>) -> Self {
        Music {
            id: MusicID(row.get_unwrap("id")),
        }
    }
}

impl<'a, 'b> From<&'a Row<'b>> for User {
    fn from(row: &'a Row<'b>) -> Self {
        User {
            id: UserID(row.get_unwrap("id")),
            name: row.get_unwrap("name"),
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
            date: row.get_unwrap("date"),
            vector: row
                .get_unwrap::<_, Option<Vec<u8>>>("vector")
                .and_then(reconstruct),
        }
    }
}

impl SerJson for TagKey {
    fn ser_json(&self, d: usize, st: &mut SerJsonState) {
        let s: String = self.into();
        s.ser_json(d, st);
    }
}

impl DeJson for TagKey {
    fn de_json(state: &mut DeJsonState, input: &mut Chars) -> Result<Self, DeJsonErr> {
        let v: String = DeJson::de_json(state, input)?;
        Ok((&*v).into())
    }
}

pub fn reconstruct(x: Vec<u8>) -> Option<Vector> {
    if x.len() % 4 != 0 {
        return None;
    }
    let mut res = Vec::with_capacity(x.len() % 4);
    for a in x.chunks_exact(4) {
        let a: [u8; 4] = <[u8; 4]>::try_from(a).unwrap();
        let lol = f32::from_le_bytes(a);
        res.push(lol);
    }
    Some(Vector(res))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_roundtrip<T: SerJson + DeJson + PartialEq + Eq + Debug>(before: T) {
        let v = nanoserde::SerJson::serialize_json(&before);
        let after: T = nanoserde::DeJson::deserialize_json(&*v).unwrap();
        assert_eq!(after, before, "json was: {}", &*v);
    }

    #[test]
    fn test_roundtrip() {
        assert_roundtrip(Tag {
            music_id: MusicID(3),
            key: TagKey::LocalMP3,
            text: Some(s!("salut")),
            integer: Some(-12),
            date: Some(s!("aaaa")),
            vector: Some(Vector(vec![1.0, 0.121, 0.333, -12.0])),
        });

        assert_roundtrip(Tag {
            music_id: MusicID(33333),
            key: TagKey::UserLibrary(s!(":aa11--")),
            text: Some(s!("")),
            integer: Some(i32::MIN),
            date: Some(s!("")),
            vector: Some(Vector(vec![0.0, 0.0, 1.0, 0.0, 0.0])),
        });

        assert_roundtrip(Tag {
            music_id: MusicID(33333),
            key: TagKey::UserLibrary(s!("")),
            text: None,
            integer: None,
            date: None,
            vector: None,
        });
    }
}
