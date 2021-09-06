use anyhow::{Context, Result};
use rusqlite::Connection;

use crate::utils::{collect_rows, row_missing_opt};
use crate::Db;

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

pub fn update(c: &Connection, key: &str, value: &str) -> Result<()> {
    c.prepare_cached(
        "UPDATE config
                    SET value=?2
                    WHERE key=?1;",
    )
    .context("update key error")?
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
    row_missing_opt(v).with_context(|| format!("error getting config key: {}", key))
}
