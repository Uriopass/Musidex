use crate::domain::sync::fetch_metadata;
use crate::infrastructure::router::RequestExt;
use crate::Pg;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response};

pub async fn metadata(req: Request<Body>) -> Result<Response<Body>> {
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let metadata = fetch_metadata(&c)
        .await
        .context("failed fetching metadata")?;

    Ok(Response::new(Body::from(serde_json::to_string(&metadata)?)))
}
