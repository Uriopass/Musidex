use super::*;
use crate::domain::entity::{Music, Tag, TagKey};
use crate::domain::worker_neural_embed::needs_embedding;
use anyhow::Result;

#[test_log::test(tokio::test)]
pub async fn test_insert_tag() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;

    let _ = Music::mk(&c)?;
    let music = Music::mk(&c)?;
    let music2 = Music::mk(&c)?;

    Tag::insert(&c, Tag::new_text(music, TagKey::LocalMP3, s!("hi.mp3")))?;
    Tag::insert(&c, Tag::new_text(music2, TagKey::LocalMP3, s!("hi.mp3")))?;

    assert!(needs_embedding(&c)?);

    Tag::insert(&c, Tag::new_text(music, TagKey::Embedding, s!("alrite")))?;
    Tag::insert(&c, Tag::new_text(music2, TagKey::Embedding, s!("alrite")))?;

    assert!(!needs_embedding(&c)?);

    Ok(())
}
