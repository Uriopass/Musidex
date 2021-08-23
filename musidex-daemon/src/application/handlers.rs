use crate::domain::entity::MusicID;
use crate::domain::{config, music, stream, sync, upload};
use crate::infrastructure::router::RequestExt;
use crate::utils::res_status;
use crate::Db;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};
use serde::Deserialize;
use serde_json::Value;
use std::convert::TryInto;

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let metadata = sync::fetch_metadata(&c).context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&metadata)?)))
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

    music::delete_music(&c, id).context("couldn't delete music from db")?;

    Ok(Response::new(Body::empty()))
}

pub async fn youtube_upload(req: Request<Body>) -> Result<Response<Body>> {
    let (parts, body) = req.into_parts();
    let f = hyper::body::to_bytes(body)
        .await
        .context("could not decode body")?;
    let b: UploadYoutube = serde_json::from_slice(&*f).context("could not parse body")?;
    let url = b.url;
    if url.len() < 3 {
        return Ok(res_status(StatusCode::BAD_REQUEST));
    }
    let db = parts.state::<Db>();
    let mut c = db.get().await;

    Ok(res_status(upload::youtube_upload(&mut c, url)?))
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
        if meta.range_size.0 > 0 && meta.range_size.1 < meta.range_size.2 {
            *r.status_mut() = StatusCode::PARTIAL_CONTENT;
        }
    }

    Ok(r)
}

pub async fn get_config(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Db>();
    let c = db.get().await;

    let keyvals = config::get_all(&c).context("failed fetching metadata")?;

    let m: serde_json::value::Map<String, Value> = keyvals
        .into_iter()
        .map(|x| (x.0, serde_json::Value::String(x.1)))
        .collect();

    Ok(Response::new(Body::from(serde_json::to_string(&m)?)))
}
