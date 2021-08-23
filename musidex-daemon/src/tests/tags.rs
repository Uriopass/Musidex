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
    assert_eq!(metadata.tags[0], tag);

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
