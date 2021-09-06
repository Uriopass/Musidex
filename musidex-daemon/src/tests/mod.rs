use crate::infrastructure::db::Db;
use crate::infrastructure::migrate::migrate;
use crate::MIGRATIONS;
use hyper::http::Extensions;
use hyper::{Body, Request};
use std::sync::Arc;

mod music;
mod tags;
mod user;
mod worker_neural_embed;
mod worker_thumbnail_resize;

async fn mk_db() -> anyhow::Result<Db> {
    let db = Db::connect_in_memory().await;
    migrate(&db, &MIGRATIONS).await?;
    Ok(db)
}

#[allow(dead_code)]
fn mk_db_extension(req: &mut Request<Body>, db: Db) {
    let mut e = Extensions::new();
    e.insert(db);
    req.extensions_mut().insert(Arc::new(e));
}
