use std::convert::TryInto;
use std::iter::FromIterator;

use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;

use crate::domain::entity::{Music, MusicID, Tag, User};
use crate::domain::sync::{serve_sync_websocket, SyncBroadcastSubscriber};
use crate::domain::{config, stream, sync, upload};
use crate::infrastructure::router::RequestExt;
use crate::utils::res_status;
use crate::Db;

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let metadata = sync::fetch_metadata(&c).context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&metadata)?)))
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

#[derive(Deserialize)]
pub struct UploadYoutube {
    pub url: String,
}

pub async fn delete_music(req: Request<Body>) -> Result<Response<Body>> {
    let music_id = req.params().get("id").context("missing parameter id")?;
    let db = req.state::<Db>();
    let c = db.get().await;

    let id = MusicID(
        music_id
            .parse()
            .context("couldn't parse music id as integer")?,
    );

    Music::delete(&c, id).context("couldn't delete music from db")?;

    Ok(Response::new(Body::empty()))
}

pub async fn youtube_upload(mut req: Request<Body>) -> Result<Response<Body>> {
    let uid = User::from_req(&req).context("no user id")?;
    let b: UploadYoutube = parse_body(&mut req).await?;
    if b.url.len() < 3 {
        return Ok(res_status(StatusCode::BAD_REQUEST));
    }
    let db = req.state::<Db>();
    let mut c = db.get().await;

    Ok(res_status(
        upload::youtube_upload(&mut c, b.url, uid).await?,
    ))
}

pub async fn youtube_upload_playlist(mut req: Request<Body>) -> Result<Response<Body>> {
    let uid = User::from_req(&req).context("no user id")?;
    let b: UploadYoutube = parse_body(&mut req).await?;
    let url = b.url;
    if url.len() < 3 {
        return Ok(res_status(StatusCode::BAD_REQUEST));
    }
    let db = req.state::<Db>();
    let mut c = db.get().await;
    Ok(res_status(
        upload::youtube_upload_playlist(&mut c, url, uid).await?,
    ))
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

pub async fn get_config(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let keyvals = config::get_all(&c).context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&keyvals)?)))
}

pub async fn parse_body<T: DeserializeOwned>(req: &mut Request<Body>) -> Result<T> {
    let f = hyper::body::to_bytes(req.body_mut())
        .await
        .context("could not decode body")?;
    serde_json::from_slice(&*f).context("could not parse body")
}
