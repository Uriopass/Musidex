use crate::domain::entity::{TagKey, User, UserID};
use crate::infrastructure::router::RequestExt;
use crate::utils::collect_rows;
use anyhow::{Context, Result};
use hyper::{Body, Request};
use rusqlite::Connection;

impl User {
    pub fn from_req(req: &Request<Body>) -> Result<UserID> {
        let id = req
            .cookies()
            .context("no cookies")?
            .0
            .get("cur_user")
            .context("no user in cookie")?
            .parse()
            .context("user is not integer")?;
        Ok(UserID(id))
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
            .prepare_cached("INSERT INTO users (name) VALUES (?1);")
            .context("error preparing create user")?
            .execute([&name])?;
        if stmt == 0 {
            bail!("could not create music");
        }

        let mut stmt = c.prepare_cached("SELECT id FROM users WHERE rowid=last_insert_rowid()")?;
        let id = stmt.query_row([], |v| v.get("id"))?;
        Ok(UserID(id))
    }

    pub fn rename(c: &Connection, id: UserID, name: String) -> Result<()> {
        let stmt = c
            .prepare_cached("UPDATE users SET name=?2 WHERE id=?1;")
            .context("error preparing rename")?
            .execute(rusqlite::params![id.0, name])?;
        if stmt == 0 {
            bail!("rename was not executed, user not found");
        }
        Ok(())
    }

    pub fn delete(c: &Connection, id: UserID) -> Result<()> {
        let mut v = c.prepare_cached("DELETE FROM users WHERE id=?1;")?;
        v.execute([&id.0])?;

        let mut v = c.prepare_cached("DELETE FROM tags WHERE key=?1;")?;
        v.execute([TagKey::UserLibrary(s!(id))])?;
        Ok(())
    }
}

impl ToString for UserID {
    fn to_string(&self) -> String {
        self.0.to_string()
    }
}
