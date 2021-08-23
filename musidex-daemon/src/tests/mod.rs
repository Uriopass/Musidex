use crate::infrastructure::db::Db;
use crate::infrastructure::migrate::migrate;
use crate::MIGRATIONS;
use hyper::http::Extensions;
use hyper::{Body, Request};
use std::sync::Arc;

mod config;
mod music;
mod tags;

async fn mk_db() -> anyhow::Result<Db> {
    let db = Db::connect_in_memory().await;
    migrate(&db, &MIGRATIONS).await?;
    Ok(db)
}

fn mk_db_extension(req: &mut Request<Body>, db: Db) {
    let mut e = Extensions::new();
    e.insert(db);
    req.extensions_mut().insert(Arc::new(e));
}
