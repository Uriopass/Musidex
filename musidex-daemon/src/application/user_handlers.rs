use crate::application::handlers::parse_body;
use crate::domain::entity::{User, UserID};
use crate::infrastructure::db::{Db, db_log, DbLog, LogAction, LogType};
use crate::infrastructure::router::RequestExt;
use anyhow::{Context, Result};
use hyper::{Body, Request, Response, StatusCode};
use nanoserde::DeJson;

#[derive(DeJson)]
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

pub async fn update(mut req: Request<Body>) -> Result<Response<Body>> {
    let data: UserCreatePOST = parse_body(&mut req).await.context("can't decode body")?;
    let id = req.params().get("id").context("no id in url")?;
    let id: i32 = id.parse().context("invalid id")?;

    let db = req.state::<Db>();
    let c = db.get().await;

    User::rename(&c, UserID(id), data.name)?;

    Ok(Response::new(Body::empty()))
}

pub async fn delete(req: Request<Body>) -> Result<Response<Body>> {
    let id = req.params().get("id").context("no id in url")?;
    let id: i32 = id.parse().context("invalid id")?;

    let db = req.state::<Db>();
    let mut c = db.get().await;

    if User::n_users(&c)? == 1 {
        return Ok(Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(Body::from("cannot remove last user"))
            .unwrap());
    }

    let tx = c.transaction().context("transaction begin failed")?;
    db_log(&tx, DbLog {
        user_id: UserID(id),
        ip: req.headers().get("x-real-ip").and_then(|x| x.to_str().ok()).map(|x| x.to_string()).unwrap_or_default(),
        type_: LogType::User,
        action: LogAction::Delete,
        music_id: None,
        target_key: None,
        target_value: None,
    });
    User::delete(&tx, UserID(id))?;
    tx.commit().context("transaction commit failed")?;

    Ok(Response::new(Body::empty()))
}
