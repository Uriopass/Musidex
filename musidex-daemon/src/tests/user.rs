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
    User::delete(&c, user.id)?;

    let users = User::list(&c)?;
    assert_eq!(users.len(), 0);

    Ok(())
}
