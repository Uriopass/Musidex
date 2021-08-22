use super::*;
use anyhow::Result;

#[test_env_log::test(tokio::test)]
pub async fn test_mk_music() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = crate::domain::music::mk_music(&c)?;
    drop(c);

    assert!(v.0 == 0 || v.0 == 1);

    Ok(())
}
