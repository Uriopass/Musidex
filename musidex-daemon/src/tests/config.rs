use crate::application::handlers::get_config;
use crate::infrastructure::db::Db;
use crate::infrastructure::migrate::migrate;
use crate::MIGRATIONS;
use anyhow::Result;
use hyper::http::Extensions;
use hyper::{Body, Request, StatusCode};
use std::sync::Arc;

#[test]
pub fn tstart() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(init());
}

pub async fn init() {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();
    log::info!("init test");
    let _ = test_get_config()
        .await
        .map_err(|e| log::error!("{:?}", e))
        .unwrap();
}

pub async fn test_get_config() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    crate::domain::config::upsert_key(&c, "salut", "salut")?;
    drop(c);

    let mut r = Request::builder().body(Body::empty())?;
    mk_db_extension(&mut r, db);

    let v = get_config(r).await.unwrap();

    assert_eq!(v.status(), StatusCode::OK);
    let bytes = hyper::body::to_bytes(v.into_body()).await?;
    assert_eq!(&*bytes, &*br#"{"salut":"salut"}"#);

    Ok(())
}

async fn mk_db() -> Result<Db> {
    let db = Db::connect_in_memory().await;
    migrate(&db, &MIGRATIONS).await?;
    Ok(db)
}

fn mk_db_extension(req: &mut Request<Body>, db: Db) {
    let mut e = Extensions::new();
    e.insert(db);
    req.extensions_mut().insert(Arc::new(e));
}
