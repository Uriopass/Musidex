use crate::domain::entity::{User, UserID};
use crate::utils::collect_rows;
use anyhow::{Context, Result};
use hyper::{Body, Request};
use rusqlite::Connection;

impl User {
    pub fn from_req(_req: &Request<Body>) -> UserID {
        UserID(1)
    }

    pub fn list(c: &Connection) -> Result<Vec<User>> {
        let mut v = c.prepare_cached("SELECT * FROM users;")?;
        let res = v.query_map([], |row| Ok(User::from(row)))?;
        collect_rows(res)
    }

    pub fn n_users(c: &Connection) -> Result<i32> {
        let mut v = c.prepare_cached("SELECT count(1) FROM users;")?;
        let res: i32 = v.query_row([], |row| row.get(0))?;
        Ok(res)
    }

    pub fn create(c: &Connection, name: String) -> Result<UserID> {
        let stmt = c
            .prepare_cached("INSERT INTO users (name) VALUES ($1);")
            .context("error preparing mk music")?
            .execute([&name])?;
        if stmt == 0 {
            bail!("could not create music");
        }

        let mut stmt = c.prepare_cached("SELECT id FROM users WHERE rowid=last_insert_rowid()")?;
        let id = stmt.query_row([], |v| v.get("id"))?;
        Ok(UserID(id))
    }

    pub fn delete(c: &Connection, id: UserID) -> Result<()> {
        let mut v = c.prepare_cached("DELETE FROM users WHERE id=$1;")?;
        v.execute([&id.0])?;
        Ok(())
    }
}

impl ToString for UserID {
    fn to_string(&self) -> String {
        self.0.to_string()
    }
}
