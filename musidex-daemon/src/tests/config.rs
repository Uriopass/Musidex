use super::*;
use crate::application::handlers::get_config;
use anyhow::Result;
use hyper::{Body, Request, StatusCode};

#[test_env_log::test(tokio::test)]
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
