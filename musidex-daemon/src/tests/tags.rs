use super::*;
use anyhow::Result;

use crate::domain::entity::{Music, Tag, TagKey};
use crate::domain::sync::fetch_metadata;

#[test_env_log::test(tokio::test)]
pub async fn test_insert_tag() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;
    let tag = Tag::new_text(music, TagKey::Duration, s!("value"));
    Tag::insert(&c, tag.clone())?;

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.musics[0], music);
    assert_eq!(metadata.tags.unwrap()[0], tag);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_remove_tag() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;
    let tag = Tag::new_text(music, TagKey::Duration, s!("value"));
    Tag::insert(&c, tag.clone())?;

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.musics[0], music);
    assert_eq!(metadata.tags.unwrap()[0], tag);

    Tag::remove(&c, tag.music_id, tag.key)?;

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.tags.unwrap().len(), 0);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_update_tag() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;
    let tag = Tag::new_text(music, TagKey::Duration, s!("123"));
    Tag::insert(&c, tag)?;

    let tag2 = Tag::new_text(music, TagKey::Duration, s!("456"));
    Tag::insert(&c, tag2.clone())?;

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.musics[0], music);
    assert_eq!(metadata.tags.unwrap()[0], tag2);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_nested_tagkey_roundtrip() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;
    let tag = Tag::new_key(music, TagKey::UserLibrary(s!(":test:test")));
    Tag::insert(&c, tag.clone())?;

    let s: String = (&tag.key).into();
    assert_eq!(s, s!("user_library::test:test"));

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.musics[0], music);
    assert_eq!(metadata.tags.unwrap()[0], tag);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_tags_by_text() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;
    let tag = Tag::new_text(music, TagKey::Duration, s!("value"));
    Tag::insert(&c, tag.clone())?;

    let tags = Tag::by_text(&c, "value")?;
    assert_eq!(tags[0], tag);

    Ok(())
}
