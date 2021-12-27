use super::*;
use crate::domain::entity::{Music, Tag, TagKey, UserID};
use crate::domain::music::delete_music;
use crate::domain::sync::fetch_metadata;
use anyhow::Result;

#[test_env_log::test(tokio::test)]
pub async fn test_mk_music() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;
    drop(c);

    assert!(v.0 == 0 || v.0 == 1);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_delete_cascade() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let id = Music::mk(&c)?;
    Tag::insert(&c, Tag::new_text(id, TagKey::Duration, s!("v")))?;

    Music::delete(&c, id)?;
    let meta = fetch_metadata(&c)?;

    assert_eq!(meta.musics.len(), 0);
    assert_eq!(meta.tags.unwrap().len(), 0);
    assert_eq!(meta.users.len(), 1);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_delete_request_zero_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    delete_music(&c, UserID(0), v)?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 0);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_delete_request_one_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;
    Tag::insert(&c, Tag::new_key(v, TagKey::UserLibrary(s!("0"))))?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    delete_music(&c, UserID(0), v)?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 0);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_delete_request_two_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;
    Tag::insert(&c, Tag::new_key(v, TagKey::UserLibrary(s!("0"))))?;
    Tag::insert(&c, Tag::new_key(v, TagKey::UserLibrary(s!("1"))))?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    delete_music(&c, UserID(0), v)?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    delete_music(&c, UserID(1), v)?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 0);

    Ok(())
}
