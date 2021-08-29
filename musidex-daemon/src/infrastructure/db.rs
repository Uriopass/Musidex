use crate::utils::env_or;
use anyhow::{Context, Result};
use rusqlite::Connection;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::{Mutex, MutexGuard};

#[derive(Default, Clone)]
pub struct Db(Arc<DbInner>);

#[derive(Default)]
pub struct DbInner {
    conns: Vec<Mutex<Connection>>,
    round_robin: AtomicUsize,
}

pub type Client<'a> = MutexGuard<'a, Connection>;

const N_CONN: usize = 8;

impl Db {
    pub async fn connect() -> Result<Db> {
        let mut pool = DbInner::default();
        for _ in 0..N_CONN {
            pool.conns.push(Mutex::new(Self::mk_conn()?));
        }
        Ok(Db(Arc::new(pool)))
    }

    pub fn mk_conn() -> Result<Connection> {
        let conn = Connection::open(env_or("DB_LOCATION", s!("./storage/db.db")))
            .context("cannot open connection to sqlite db")?;
        conn.set_prepared_statement_cache_capacity(256);
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(conn)
    }

    #[cfg(test)]
    pub async fn connect_in_memory() -> Db {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        let mut inner = DbInner::default();
        inner.conns.push(Mutex::new(conn));
        Db(Arc::new(inner))
    }

    pub async fn get(&self) -> Client<'_> {
        for v in &self.0.conns {
            if let Ok(x) = v.try_lock() {
                return x;
            }
        }
        let v = self.0.round_robin.fetch_add(1, Ordering::SeqCst);
        self.0.conns[v % N_CONN].lock().await
    }
}
