use crate::application::handlers::parse_body;
use crate::domain::entity::{User, UserID};
use crate::infrastructure::db::Db;
use crate::infrastructure::router::RequestExt;
use crate::utils::res_status;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct UserCreatePOST {
    pub name: String,
}

pub async fn create(mut req: Request<Body>) -> Result<Response<Body>> {
    let data: UserCreatePOST = parse_body(&mut req).await.context("can't decode body")?;

    let db = req.state::<Db>();
    let c = db.get().await;

    User::create(&c, data.name)?;

    Ok(Response::new(Body::empty()))
}

pub async fn delete(req: Request<Body>) -> Result<Response<Body>> {
    let id = req.params().get("id").context("no id in url")?;
    let id: i32 = id.parse().context("invalid id")?;

    let db = req.state::<Db>();
    let c = db.get().await;

    if User::n_users(&c)? == 1 {
        return Ok(Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(Body::from("cannot remove last user"))
            .unwrap());
    }

    User::delete(&c, UserID(id))?;

    Ok(Response::new(Body::empty()))
}
