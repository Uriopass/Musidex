use crate::Pg;
use anyhow::{Context, Result};
use tokio_postgres::Client;

#[rustfmt::skip]
const DEFAULT_CONFIG: &[(&str, &str)] = &[
    ("config_test", "1")
];

pub async fn init(db: &Pg) -> Result<()> {
    log::info!("checking for missing config keys");
    let c = db.get().await?;
    for (key, value) in DEFAULT_CONFIG {
        insert_if_not_exist(&c, key, value).await?;
    }
    Ok(())
}

#[allow(dead_code)]
pub async fn upsert_key(c: &Client, key: &str, value: &str) -> Result<()> {
    c.execute(
        "INSERT INTO config (key, value)\
                    VALUES ($1, $2)
                    ON CONFLICT (key) DO\
                    UPDATE SET value=$2;",
        &[&key, &value],
    )
    .await
    .context("upsert key error")
    .map(|_| ())
}

async fn insert_if_not_exist(c: &Client, key: &str, value: &str) -> Result<()> {
    c.execute(
        "INSERT INTO config (key, value)\
                    VALUES ($1, $2)
                    ON CONFLICT (key) DO NOTHING;",
        &[&key, &value],
    )
    .await
    .context("insert if not exist error")
    .map(|_| ())
}

pub async fn get_all(c: &Client) -> Result<Vec<(String, String)>> {
    let v = c.query("SELECT key,value FROM config", &[]).await?;
    Ok(v.into_iter()
        .map(|x| (x.get("key"), x.get("value")))
        .collect())
}

#[allow(dead_code)]
pub async fn get(c: &Client, key: &str) -> Result<Option<String>> {
    let v = c
        .query_one("SELECT value FROM config WHERE key= $1", &[&key])
        .await;
    match v {
        Ok(x) => Ok(x.try_get("value").ok()),
        Err(e) => match e.as_db_error() {
            None => Ok(None),
            Some(e) => Err(e.clone()).with_context(|| format!("error getting config key: {}", key)),
        },
    }
}
