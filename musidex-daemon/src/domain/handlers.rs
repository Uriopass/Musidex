use crate::domain::{config, sync};
use crate::infrastructure::router::RequestExt;
use crate::Pg;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response};
use serde_json::Value;

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let metadata = sync::fetch_metadata(&c)
        .await
        .context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&metadata)?)))
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
