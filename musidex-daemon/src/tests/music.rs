use super::*;
use crate::domain::entity::{Music, Tag, TagKey, UserID};
use crate::domain::music::delete_music;
use crate::domain::sync::fetch_metadata;
use anyhow::Result;
use hyper::StatusCode;

#[test_log::test(tokio::test)]
pub async fn test_mk_music() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;
    drop(c);

    assert!(v.0 == 0 || v.0 == 1);

    Ok(())
}

#[test_log::test(tokio::test)]
pub async fn test_merge_music() -> Result<()> {
    let db = mk_db().await?;
    let mut c = db.get().await;
    let v = Music::mk(&c)?;
    let v2 = Music::mk(&c)?;

    Tag::insert(&c, Tag::new_key(v, TagKey::UserLibrary(s!("0"))))?;
    Tag::insert(&c, Tag::new_key(v2, TagKey::UserLibrary(s!("1"))))?;

    Tag::insert(&c, Tag::new_text(v, TagKey::Artist, s!("a")))?;
    Tag::insert(&c, Tag::new_text(v2, TagKey::Artist, s!("b")))?;

    Music::merge(&mut c, v, v2)?;

    let meta = fetch_metadata(&c)?;

    assert_eq!(meta.musics.len(), 1);
    assert_eq!(meta.users.len(), 1);
    assert_eq!(meta.tags.as_ref().unwrap().len(), 3);

    assert!(meta
        .tags
        .as_ref()
        .unwrap()
        .iter()
        .any(|x| x.key == TagKey::Artist && x.text == Some(s!("a"))));

    Ok(())
}

#[test_log::test(tokio::test)]
pub async fn test_update_cascade() -> Result<()> {
    let db = mk_db().await?;
    let mut c = db.get().await;
    let id = Music::mk(&c)?;
    Tag::insert(&c, Tag::new_text(id, TagKey::Duration, s!("v")))?;

    Music::put_on_top(&mut c, id)?;
    let meta = fetch_metadata(&c)?;

    assert_eq!(meta.musics.len(), 1);
    assert_eq!(meta.tags.unwrap().len(), 1);
    assert_eq!(meta.users.len(), 1);

    Ok(())
}

#[test_log::test(tokio::test)]
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

#[test_log::test(tokio::test)]
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

#[test_log::test(tokio::test)]
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

#[test_log::test(tokio::test)]
pub async fn test_delete_request_one_user_wrong_user() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let v = Music::mk(&c)?;
    Tag::insert(&c, Tag::new_key(v, TagKey::UserLibrary(s!("0"))))?;

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    assert_eq!(delete_music(&c, UserID(-1), v)?, StatusCode::FORBIDDEN);

    let meta = fetch_metadata(&c)?;
    assert_eq!(meta.musics.len(), 1);

    Ok(())
}

#[test_log::test(tokio::test)]
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
