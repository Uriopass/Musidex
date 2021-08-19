use crate::domain::entity::MusicID;
use crate::domain::{config, stream, sync};
use crate::infrastructure::router::RequestExt;
use crate::utils::get_file_range;
use crate::Pg;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};
use serde_json::Value;
use std::convert::TryInto;

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let metadata = sync::fetch_metadata(&c)
        .await
        .context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&metadata)?)))
}

pub async fn stream(req: Request<Body>) -> Result<Response<Body>> {
    let music_id = req.params().get("musicid").context("invalid music id")?;
    let id = MusicID(
        music_id
            .parse()
            .context("couldn't parse music id as integer")?,
    );
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let source_path = stream::stream_path(&c, id).await?;
    let file_path = format!("./storage/{}", source_path);

    let range_size;
    let buf = if let Some(rangev) = req.headers().get(hyper::header::RANGE) {
        let range = http_range::HttpRange::parse_bytes(rangev.as_bytes(), u32::MAX as u64)
            .map_err(|_| anyhow!("could not decode range"))?;
        log::info!(
            "asked with range {:?}: {}",
            range[0],
            rangev.to_str().unwrap()
        );
        let r = range.get(0).context("no ranges")?;
        let buf = get_file_range(file_path, (r.start, r.start + r.length))?;
        let len = r.start + buf.len() as u64;
        range_size = (
            r.start,
            (r.start + r.length).min(len.saturating_sub(1)),
            len,
        );
        buf
    } else {
        let buf = std::fs::read(file_path).context("failed reading source")?;
        let l = buf.len() as u64;
        range_size = (0, l.saturating_sub(1), l);
        buf
    };

    let mut r = Response::new(Body::from(buf));

    let content_type = if source_path.ends_with("mp3") {
        "audio/mpeg"
    } else if source_path.ends_with("ogg") {
        "audio/ogg"
    } else if source_path.ends_with("m4a") {
        "audio/mp4"
    } else {
        ""
    };
    r.headers_mut()
        .insert(hyper::header::CONTENT_TYPE, content_type.parse()?);
    r.headers_mut()
        .insert(hyper::header::ACCEPT_RANGES, "bytes".parse()?);
    if req.headers().contains_key(hyper::header::RANGE) {
        r.headers_mut().insert(
            hyper::header::CONTENT_RANGE,
            format!("bytes {}-{}/{}", range_size.0, range_size.1, range_size.2).try_into()?,
        );
        if range_size.0 > 0 && range_size.1 < range_size.2 {
            *r.status_mut() = StatusCode::PARTIAL_CONTENT;
        }
    }

    Ok(r)
}

pub async fn get_config(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let keyvals = config::get_all(&c)
        .await
        .context("failed fetching metadata")?;

    let m: serde_json::value::Map<String, Value> = keyvals
        .into_iter()
        .map(|x| (x.0, serde_json::Value::String(x.1)))
        .collect();

    Ok(Response::new(Body::from(serde_json::to_string(&m)?)))
}
