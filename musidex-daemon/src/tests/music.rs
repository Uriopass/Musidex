use super::*;
use crate::domain::entity::{Source, Tag};
use crate::domain::music::delete_music;
use crate::domain::sync::fetch_metadata;
use crate::domain::{music, source, tags};
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

#[test_env_log::test(tokio::test)]
pub async fn test_delete_cascade() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let id = music::mk_music(&c)?;
    tags::insert_tag(&c, Tag::new_text(id, s!("key"), s!("v")))?;
    source::insert_source(
        &c,
        Source {
            music_id: id,
            format: s!("test"),
            url: s!("test"),
        },
    )?;

    delete_music(&c, id)?;
    let meta = fetch_metadata(&c)?;

    assert_eq!(meta.musics.len(), 0);
    assert_eq!(meta.tags.len(), 0);
    assert_eq!(meta.sources.len(), 0);

    Ok(())
}
