use crate::utils::env_or;
use anyhow::{Context, Result};
use rusqlite::Connection;
use std::sync::Arc;
use tokio::sync::{Mutex, MutexGuard};

#[derive(Clone)]
pub struct Db(Arc<tokio::sync::Mutex<Connection>>);

pub type Client<'a> = MutexGuard<'a, Connection>;

impl Db {
    pub async fn connect() -> Result<Db> {
        let conn = Connection::open(env_or("DB_LOCATION", s!("./storage/db.db")))
            .context("cannot open connection to sqlite db")?;
        conn.set_prepared_statement_cache_capacity(256);
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        let pool = Db(Arc::new(Mutex::new(conn)));
        Ok(pool)
    }

    #[allow(dead_code)]
    pub async fn connect_in_memory() -> Db {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        Db(Arc::new(Mutex::new(conn)))
    }

    pub async fn get(&self) -> Client<'_> {
        self.0.lock().await
    }
}
