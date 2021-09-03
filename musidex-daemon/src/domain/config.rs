use crate::utils::collect_rows;
use crate::Db;
use anyhow::{Context, Result};
use rusqlite::Connection;

#[rustfmt::skip]
const DEFAULT_CONFIG: &[(&str, &str)] = &[
    ("config_test", "1")
];

pub async fn init(db: &Db) -> Result<()> {
    log::info!("checking for missing config keys");
    let c = db.get().await;
    for (key, value) in DEFAULT_CONFIG {
        insert_if_not_exist(&c, key, value)?;
    }
    Ok(())
}

#[allow(dead_code)]
pub fn upsert_key(c: &Connection, key: &str, value: &str) -> Result<()> {
    c.prepare_cached(
        "INSERT INTO config (key, value)
                    VALUES (?1, ?2)
                    ON CONFLICT (key)
                    DO UPDATE SET value=?2;",
    )
    .context("upsert key error")?
    .execute([&key, &value])?;
    Ok(())
}

fn insert_if_not_exist(c: &Connection, key: &str, value: &str) -> Result<()> {
    c.prepare_cached(
        "INSERT INTO config (key, value)
                    VALUES (?1, ?2)
                    ON CONFLICT (key) DO NOTHING",
    )
    .context("insert if not exist error")?
    .execute([&key, &value])?;
    Ok(())
}

pub fn get_all(c: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt = c.prepare_cached("SELECT key,value FROM config")?;
    let v = stmt.query_map([], |x| Ok((x.get("key")?, x.get("value")?)))?;
    collect_rows(v)
}

#[allow(dead_code)]
pub fn get(c: &Connection, key: &str) -> Result<Option<String>> {
    let v = c
        .prepare_cached("SELECT value FROM config WHERE key= ?1")?
        .query_row([&key], |v| v.get("value"));
    match v {
        Ok(x) => Ok(x),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e).with_context(|| format!("error getting config key: {}", key)),
    }
}
