use super::*;
use crate::domain::entity::User;
use anyhow::{Context, Result};

#[test_env_log::test(tokio::test)]
pub async fn test_crd_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    c.execute_batch("DELETE FROM users;")?;

    let u = User::create(&c, s!("toto"))?;

    let users = User::list(&c)?;
    let user = users.get(0).context("no user")?;
    assert_eq!(user.name, s!("toto"));
    assert_eq!(user.id, u);
    assert_eq!(User::n_users(&c)?, 1);
    User::delete(&c, user.id)?;

    let users = User::list(&c)?;
    assert_eq!(users.len(), 0);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_update_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    c.execute_batch("DELETE FROM users;")?;

    let u = User::create(&c, s!("toto"))?;

    User::rename(&c, u, s!("tata")).unwrap();

    let users = User::list(&c)?;
    let user = users.get(0).context("no user")?;
    assert_eq!(user.name, s!("tata"), "user name is different");

    Ok(())
}
