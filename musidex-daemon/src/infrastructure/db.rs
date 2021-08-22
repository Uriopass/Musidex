use crate::utils::env_or;
use anyhow::{Context, Result};
use rusqlite::Connection;
use tokio::sync::{Mutex, MutexGuard};

pub struct Db(tokio::sync::Mutex<Connection>);

pub type Client<'a> = MutexGuard<'a, Connection>;

impl Db {
    pub async fn connect() -> Result<Db> {
        let cfg = Connection::open(env_or("DB_LOCATION", "./storage/db.db".to_string()))
            .context("cannot open connection to sqlite db")?;
        let pool = Db(Mutex::new(cfg));
        Ok(pool)
    }

    pub async fn connect_in_memory() -> Db {
        Db(Mutex::new(Connection::open_in_memory().unwrap()))
    }

    pub async fn get(&self) -> Client<'_> {
        self.0.lock().await
    }
}
