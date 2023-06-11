use std::convert::TryInto;

use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};

use crate::domain::entity::{Music, MusicID, Tag, TagKey, User, UserID};
use crate::domain::music::delete_music;
use crate::domain::sync::{compress_meta, serve_sync_websocket, SyncBroadcastSubscriber};
use crate::domain::{stream, sync, upload};
use crate::infrastructure::router::RequestExt;
use crate::utils::res_status;
use crate::Db;
use nanoserde::{DeJson, SerJson};

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let metadata = sync::fetch_metadata(&c).context("failed fetching metadata")?;

    Ok(Response::new(Body::from(metadata.serialize_json())))
}

pub async fn metadata_compressed(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let metadata = sync::fetch_metadata(&c).context("failed fetching metadata")?;
    let compressed = compress_meta(&metadata);

    Ok(Response::new(Body::from(compressed)))
}

#[derive(SerJson)]
struct ExtData {
    users: Vec<User>,
}

pub async fn metadata_extension(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let users = User::list(&c).context("failed fetching users")?;

    Ok(Response::new(Body::from(
        ExtData { users }.serialize_json(),
    )))
}

pub async fn ping(_: Request<Body>) -> Result<Response<Body>> {
    Ok(Response::new(Body::empty()))
}

pub async fn subscribe_sync(request: Request<Body>) -> Result<Response<Body>> {
    if !hyper_tungstenite::is_upgrade_request(&request) {
        return Ok(Response::new(Body::empty()));
    }
    let st = request.state::<SyncBroadcastSubscriber>().clone();
    let (response, websocket) = hyper_tungstenite::upgrade(request, None)?;

    tokio::spawn(async move {
        if let Err(e) = serve_sync_websocket(websocket, st).await {
            log::error!("error in websocket connection: {}", e);
        }
    });

    Ok(response)
}

pub async fn create_tag(mut req: Request<Body>) -> Result<Response<Body>> {
    let tag: Tag = parse_body(&mut req).await?;

    let db = req.state::<Db>();
    let c = db.get().await;

    Tag::insert(&c, tag)?;

    Ok(Response::new(Body::empty()))
}

pub async fn put_on_top(req: Request<Body>) -> Result<Response<Body>> {
    let id = req.params().get("id").context("no id in url")?;
    let id: i32 = id.parse().context("invalid id")?;

    let db = req.state::<Db>();
    let mut c = db.get().await;

    if !Music::put_on_top(&mut c, MusicID(id))? {
        return Ok(res_status(StatusCode::NOT_FOUND));
    }

    Ok(Response::new(Body::empty()))
}

#[derive(DeJson)]
pub struct DeleteTag {
    pub music_id: MusicID,
    pub key: TagKey,
}

pub async fn delete_tag(mut req: Request<Body>) -> Result<Response<Body>> {
    let tag: DeleteTag = parse_body(&mut req).await?;

    let db = req.state::<Db>();
    let c = db.get().await;

    Tag::remove(&c, tag.music_id, tag.key)?;

    Ok(Response::new(Body::empty()))
}

#[derive(DeJson)]
pub struct MergeMusic {
    id1: MusicID,
    id2: MusicID,
}

pub async fn merge_music(mut req: Request<Body>) -> Result<Response<Body>> {
    let MergeMusic { id1, id2 } = parse_body(&mut req).await?;

    if id1 == id2 {
        return Ok(Response::new(Body::empty()));
    }

    let db = req.state::<Db>();
    let mut c = db.get().await;

    Music::merge(&mut c, id1, id2)?;

    Ok(Response::new(Body::empty()))
}

pub async fn delete_music_handler(req: Request<Body>) -> Result<Response<Body>> {
    let music_id = req.params().get("id").context("missing parameter id")?;
    let db = req.state::<Db>();
    let c = db.get().await;

    let id = MusicID(
        music_id
            .parse()
            .context("couldn't parse music id as integer")?,
    );
    let uid = User::from_req(&req).context("no user id")?;

    Ok(res_status(delete_music(&c, uid, id)?))
}

#[derive(DeJson)]
pub struct UploadYoutube {
    pub url: String,
    pub uid: Option<i32>,
    #[nserde(rename = "indexStart")]
    pub index_start: Option<usize>,
    #[nserde(rename = "indexStop")]
    pub index_stop: Option<usize>,
}

pub async fn youtube_upload(mut req: Request<Body>) -> Result<Response<Body>> {
    let b: UploadYoutube = parse_body(&mut req).await?;
    if b.url.len() < 3 {
        return Ok(res_status(StatusCode::BAD_REQUEST));
    }
    let uid = match b.uid {
        Some(x) => UserID(x),
        None => User::from_req(&req).context("no user id")?,
    };
    let db = req.state::<Db>();
    let mut c = db.get().await;

    Ok(res_status(
        upload::youtube_upload(&mut c, b.url, uid).await?,
    ))
}

pub async fn youtube_upload_playlist(mut req: Request<Body>) -> Result<Response<Body>> {
    let b: UploadYoutube = parse_body(&mut req).await?;
    let url = b.url;
    if url.len() < 3 {
        return Ok(res_status(StatusCode::BAD_REQUEST));
    }
    let uid = match b.uid {
        Some(x) => UserID(x),
        None => User::from_req(&req).context("no user id")?,
    };

    let db = req.state::<Db>();
    let mut c = db.get().await;
    let (status, count) =
        upload::youtube_upload_playlist(&mut c, url, b.index_start, b.index_stop, uid).await?;
    let mut r = Response::new(Body::from(count.to_string()));
    *r.status_mut() = status;
    Ok(r)
}

#[derive(DeJson)]
pub struct ConfigUpdate {
    pub key: String,
    pub value: String,
}

pub async fn update_config(mut req: Request<Body>) -> Result<Response<Body>> {
    let uid = User::from_req(&req).context("no user id")?;
    let b: ConfigUpdate = parse_body(&mut req).await?;
    log::info!("{:?} requested config change: {}={}", uid, &b.key, &b.value);
    let db = req.state::<Db>();
    let c = db.get().await;

    crate::domain::config::update(&c, &b.key, &b.value)?;

    Ok(Response::new(Body::empty()))
}

pub async fn stream(req: Request<Body>) -> Result<Response<Body>> {
    let music_id = req.params().get("musicid").context("invalid music id")?;
    let id = MusicID(
        music_id
            .parse()
            .context("couldn't parse music id as integer")?,
    );
    let db = req.state::<Db>();
    let c = db.get().await;

    let meta = stream::stream_music(c, id, req.headers().get(hyper::header::RANGE)).await?;

    let mut r = Response::new(Body::from(meta.buf));

    r.headers_mut()
        .insert(hyper::header::CONTENT_TYPE, meta.content_type.parse()?);
    r.headers_mut()
        .insert(hyper::header::ACCEPT_RANGES, "bytes".parse()?);

    if req.headers().contains_key(hyper::header::RANGE) {
        r.headers_mut().insert(
            hyper::header::CONTENT_RANGE,
            format!(
                "bytes {}-{}/{}",
                meta.range_size.0, meta.range_size.1, meta.range_size.2
            )
            .try_into()?,
        );
        *r.status_mut() = StatusCode::PARTIAL_CONTENT;
    }

    Ok(r)
}

pub async fn parse_body<T: DeJson>(req: &mut Request<Body>) -> Result<T> {
    let f = hyper::body::to_bytes(req.body_mut())
        .await
        .context("could not decode body")?;
    nanoserde::DeJson::deserialize_json(&*String::from_utf8_lossy(f.as_ref()))
        .context("could not parse body")
}
