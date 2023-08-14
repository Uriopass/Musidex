use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use futures::{sink::SinkExt, stream::StreamExt};
use hyper_tungstenite::{tungstenite, HyperWebsocket};
use nanoserde::SerJson;
use rusqlite::Connection;
use tokio::sync::mpsc;
use tokio::sync::watch;
use tungstenite::Message;

use crate::domain::config;
use crate::domain::entity::{Music, MusicID, MusidexMetadata, Patch, Tag, TagKey, User};
use crate::infrastructure::db::Db;
use crate::utils::collect_rows;
use std::collections::HashMap;

#[derive(Clone)]
pub struct SyncBroadcastSubscriber {
    rx: watch::Receiver<Arc<(MusidexMetadata, Option<MusidexMetadata>)>>,
    refresh_tx: mpsc::Sender<()>,
}

pub struct SyncBroadcast {
    c: Connection,
    tx: watch::Sender<Arc<(MusidexMetadata, Option<MusidexMetadata>)>>,
    refresh_tx: mpsc::Sender<()>,
    refresh_rx: mpsc::Receiver<()>,
}

pub fn compress_meta(x: &MusidexMetadata) -> Vec<u8> {
    let json = x.serialize_json();
    miniz_oxide::deflate::compress_to_vec(json.as_bytes(), 5)
}

impl SyncBroadcast {
    pub fn new() -> Result<(Self, SyncBroadcastSubscriber)> {
        let (tx, rx) = watch::channel(Arc::new((MusidexMetadata::default(), None)));
        let (refresh_tx, refresh_rx) = mpsc::channel(16);
        Ok((
            Self {
                c: Db::mk_conn()?,
                tx,
                refresh_tx: refresh_tx.clone(),
                refresh_rx,
            },
            SyncBroadcastSubscriber { rx, refresh_tx },
        ))
    }

    pub fn start_workers(self) {
        let refresh_tx = self.refresh_tx;
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(2)).await;
                let _ = refresh_tx.send(()).await;
            }
        });
        let mut r = self.refresh_rx;
        let db = self.c;
        let tx = self.tx;
        tokio::spawn(async move {
            let mut last_hash = 1234;
            let mut last_map: Option<TagMap> = None;
            while let Some(()) = r.recv().await {
                let m = fetch_metadata(&db);
                let m = match m {
                    Ok(x) => x,
                    Err(e) => {
                        log::error!("error fetching metadata to send to subscribers: {}", e);
                        continue;
                    }
                };
                let mut s = DefaultHasher::new();
                m.hash(&mut s);
                let hash = s.finish();

                if hash == last_hash {
                    continue;
                }
                last_hash = hash;

                let (last_mapp, musipatch) = mk_patches(&last_map, &m);
                last_map = Some(last_mapp);

                let _ = tx.send(Arc::new((m, musipatch)));
            }
        });
    }
}

type TagMap = HashMap<(i32, TagKey), Tag>;

pub fn mk_patches(
    last_map: &Option<TagMap>,
    new: &MusidexMetadata,
) -> (TagMap, Option<MusidexMetadata>) {
    let newmap = mk_tag_map(new);

    if let Some(last_map) = last_map {
        let mut patches = Vec::with_capacity(5);

        for k in last_map.keys() {
            if newmap.contains_key(k) {
                continue;
            }
            patches.push(Patch {
                kind: s!("remove"),
                tag: Tag::new_key(MusicID(k.0), k.1.clone()),
            })
        }

        for (k, t) in &newmap {
            let last_get = last_map.get(k);
            if last_get == Some(t) {
                continue;
            }
            if last_get.is_none() {
                patches.push(Patch {
                    kind: s!("add"),
                    tag: t.clone(),
                });
                continue;
            }
            patches.push(Patch {
                kind: s!("update"),
                tag: t.clone(),
            })
        }

        let newpatch = MusidexMetadata {
            musics: new.musics.clone(),
            tags: None,
            users: new.users.clone(),
            settings: new.settings.clone(),
            patches: Some(patches),
        };
        return (newmap, Some(newpatch));
    }
    (newmap, None)
}

pub fn mk_tag_map(x: &MusidexMetadata) -> TagMap {
    let tags = unwrap_ret!(x.tags.as_ref(), HashMap::default());
    let mut v = HashMap::with_capacity(tags.len());
    for t in tags {
        v.insert((t.music_id.0, t.key.clone()), t.clone());
    }
    v
}

pub async fn serve_sync_websocket(
    websocket: HyperWebsocket,
    mut b: SyncBroadcastSubscriber,
) -> Result<()> {
    let mut websocket = websocket.await?;
    let mut first_msg = true;

    loop {
        tokio::select! {
            Some(message) = websocket.next() => {
                let message: Message = message?;
                match message {
                    Message::Close(_) => {
                        log::info!("closing WS");
                        return Ok(());
                    }
                    Message::Ping(v) => {
                        websocket.send(Message::Pong(v)).await?;
                    },
                    Message::Binary(_) | Message::Pong(_) | Message::Frame(_) => {},
                    Message::Text(v) => {
                        if &v == "refresh" {
                            let _ = b.refresh_tx.send(()).await;
                        }
                    }
                }
            }
            Ok(_) = b.rx.changed() => {
                let meta = b.rx.borrow().clone();

                let (musi, musipatch) = &*meta;

                let chosen = if first_msg {
                    first_msg = false;
                    &musi
                } else {
                    musipatch.as_ref().unwrap_or(&musi)
                };

                websocket.send(Message::Binary(compress_meta(chosen))).await?;
            }
        }
    }
}

pub fn fetch_metadata(c: &Connection) -> Result<MusidexMetadata> {
    let mut musics = c.prepare_cached("SELECT * FROM musics")?;
    let mut tags = c.prepare_cached("SELECT * FROM tags")?;

    let musics = musics.query_map([], |r| Ok(Into::into(r)))?;
    let tags = tags.query_map([], |r| Ok(Into::into(r)))?;

    let musics = collect_rows(musics.map(|x| x.map(|v: Music| v.id)))?;
    let tags = collect_rows(tags)?;

    let mut users = User::list(c)?;
    let config = config::get_all(c)?;

    users.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(MusidexMetadata {
        musics,
        tags: Some(tags),
        users,
        settings: config,
        patches: None,
    })
}
