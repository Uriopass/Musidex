use super::*;
use crate::domain::entity::{Music, Tag, TagKey};
use crate::domain::worker_thumbnail_resize::find_candidate;
use anyhow::Result;

#[test_env_log::test(tokio::test)]
pub async fn test_find_candidate() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = Music::mk(&c)?;

    Tag::insert(&c, Tag::new_text(music, TagKey::Thumbnail, s!("hi.jpg")))?;

    assert_eq!(Some(music), find_candidate(&c)?);

    Tag::insert(
        &c,
        Tag::new_text(music, TagKey::CompressedThumbnail, s!("smol.hi.jpg")),
    )?;

    assert!(find_candidate(&c)?.is_none());

    Ok(())
}
