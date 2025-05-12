use crate::domain::entity::{MusicID, TagKey, UserID};
use crate::utils::env_or;
use anyhow::{Context, Result};
use rusqlite::{params, Connection};
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

pub enum LogType {
    User,
    Tag,
    Music,
}

#[allow(dead_code)]
pub enum LogAction {
    Create,
    Update,
    Delete,
}

pub struct DbLog {
    pub user_id: UserID,
    pub ip: String,
    pub type_: LogType,
    pub action: LogAction,
    pub music_id: Option<MusicID>,
    pub target_key: Option<TagKey>,
    pub target_value: Option<String>,
}

pub fn db_log(c: &Connection, log: DbLog) {
    let mut stmt = c
        .prepare_cached(
            "INSERT INTO logs (timestamp, user_id, ip, type, action, music_id, target_key, target_value)
            VALUES (DATETIME('now'), ?1, ?2, ?3, ?4, ?5, ?6, ?7);",
        )
        .unwrap();
    stmt.execute(params![
        log.user_id.0,
        log.ip,
        match log.type_ {
            LogType::User => "user",
            LogType::Tag => "tag",
            LogType::Music => "music",
        },
        match log.action {
            LogAction::Create => "create",
            LogAction::Update => "update",
            LogAction::Delete => "delete",
        },
        log.music_id.map(|x| x.0),
        log.target_key,
        log.target_value,
    ])
    .unwrap();
}
