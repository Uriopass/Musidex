use crate::domain::handlers::get_config;
use crate::infrastructure::db::Pg;
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
    let db = Pg::connect().await.unwrap();

    test_get_config(&db).await.unwrap();
}

pub async fn test_get_config(db: &Pg) -> Result<()> {
    db.clean().await?;

    let mut r = Request::builder().body(Body::empty())?;
    mk_db_extension(&mut r, db);

    let v = get_config(r).await.unwrap();

    assert_eq!(v.status(), StatusCode::OK);
    let bytes = hyper::body::to_bytes(v.into_body()).await?;
    assert_eq!(&*bytes, &*b"{}");

    Ok(())
}

fn mk_db_extension(req: &mut Request<Body>, db: &Pg) {
    let mut e = Extensions::new();
    e.insert(db.clone());
    req.extensions_mut().insert(Arc::new(e));
}
