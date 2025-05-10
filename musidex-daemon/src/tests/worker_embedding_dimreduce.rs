use super::*;
use crate::domain::entity::{Music, Tag, TagKey, Vector};
use crate::domain::worker_embedding_dimreduce::{needs_reembed, EmbeddingReduceWorker};
use anyhow::Result;
use tinyrand::Rand;

#[test_log::test(tokio::test)]
pub async fn test_dimreduce() -> Result<()> {
    let db = mk_db().await?;

    let db = db.clone();
    let mut c = db.get().await;

    let mut randd = tinyrand::xorshift::Xorshift::default();
    for _ in 0..40 {
        let music = Music::mk(&c)?;

        let mut vec = Vec::with_capacity(200);
        for _ in 0..200 {
            vec.push(randd.next_u64() as f32 / u64::MAX as f32);
        }

        Tag::insert_silent(
            &c,
            Tag::new_vector(music, TagKey::FullEmbedding, Vector(vec)),
        )?;
    }

    assert!(needs_reembed(&c)?);

    let tags = Tag::by_key(&c, TagKey::FullEmbedding)?;
    for tag in tags {
        log::info!("{:?}", tag.vector);
    }
    EmbeddingReduceWorker::step(&mut c)?;

    let tags = Tag::by_key(&c, TagKey::Embedding)?;

    for tag in tags {
        log::info!("{:?}", tag.vector);
    }

    Ok(())
}
