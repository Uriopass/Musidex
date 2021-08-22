use super::*;
use anyhow::Result;

use crate::domain::entity::Tag;
use crate::domain::music::mk_music;
use crate::domain::sync::fetch_metadata;
use crate::domain::tags;

#[test_env_log::test(tokio::test)]
pub async fn test_insert_tag() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = mk_music(&c)?;
    let tag = Tag::new_text(music, s!("key"), s!("value"));
    tags::insert_tag(&c, tag.clone())?;

    let metadata = fetch_metadata(&c)?;
    assert_eq!(metadata.musics[0].id, music);
    assert_eq!(metadata.tags[0], tag);

    Ok(())
}

#[test_env_log::test(tokio::test)]
pub async fn test_tags_by_text() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let music = mk_music(&c)?;
    let tag = Tag::new_text(music, s!("key"), s!("value"));
    tags::insert_tag(&c, tag.clone())?;

    let tags = tags::tags_by_text(&c, "value")?;
    assert_eq!(tags[0], tag);

    Ok(())
}
