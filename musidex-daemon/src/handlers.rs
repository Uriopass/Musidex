use crate::router::RequestExt;
use crate::Pg;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response};

pub async fn hello_test(req: Request<Body>) -> Result<Response<Body>> {
    let params = req.params();
    let db = req.state::<Pg>();
    let c = db.get().await?;

    let id = params.find("id").context("id not in url")?;
    let test = crate::config::get(&c, id).await?.context("key not found")?;

    Ok(Response::new(Body::from(format!(
        "Hello {}! pg key gives {}",
        id, test
    ))))
}
