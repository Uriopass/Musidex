use std::time::Duration;

use anyhow::{Context, Result};
use rusqlite::Connection;

use crate::domain::entity::{Tag, TagKey, Vector};
use crate::infrastructure::db::Db;
use nalgebra::SVD;

pub struct EmbeddingReduceWorker {
    db: Db,
}

impl EmbeddingReduceWorker {
    pub fn new(db: Db) -> Self {
        EmbeddingReduceWorker { db }
    }

    pub fn start(self) {
        let _ = tokio::spawn(async move {
            loop {
                let mut c = self.db.get().await;
                let v = Self::step(&mut c).context("error while running dimreduce worker");
                if let Err(e) = v {
                    log::error!("{:?}", e);
                }
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });
    }

    pub fn step(c: &mut Connection) -> Result<()> {
        if !needs_reembed(&c)? {
            return Ok(());
        }

        log::info!("some musics need their embeddings reduced");
        let t = std::time::Instant::now();

        let transac = c.transaction()?;
        let mut all_embeddings = Tag::by_key(&transac, &TagKey::FullEmbedding)?;

        let mut vectors: Vec<Vector> = all_embeddings
            .iter_mut()
            .map(|v| v.vector.take().unwrap())
            .collect();

        let t_pca = std::time::Instant::now();
        pca(&mut vectors);
        log::info!("pca done in {:?}", t_pca.elapsed());

        for (mut tag, vector) in all_embeddings.into_iter().zip(vectors.into_iter()) {
            tag.vector = Some(vector);
            tag.key = TagKey::Embedding;
            Tag::insert_silent(&transac, tag)?;
        }
        transac.commit()?;

        log::info!("embedding reduced in {:?}", t.elapsed());

        Ok(())
    }
}

const N_COMPONENTS: usize = 64;

pub fn pca(vectors: &mut Vec<Vector>) {
    if vectors.len() < N_COMPONENTS {
        log::warn!("not enough vectors to reduce, skipping pca reduction");
        return;
    }
    // normalize vectors to unit length
    for v in vectors.iter_mut() {
        let norm = v.0.iter().map(|x| x * x).sum::<f32>().sqrt();
        for x in v.0.iter_mut() {
            *x /= norm;
        }
    }
    let v_length = vectors[0].0.len();

    // compute SVD
    let x = nalgebra::DMatrix::from_row_iterator(
        vectors.len(),
        v_length,
        vectors.iter().flat_map(|x| x.0.iter().copied()),
    );
    let SVD {
        u,
        singular_values,
        v_t: _,
    } = SVD::new(x, true, false);
    let mut u = u.unwrap();
    let mut u = u.fixed_columns_mut::<N_COMPONENTS>(0);

    for col in 0..u.ncols() {
        for row in 0..u.nrows() {
            u[(row, col)] = u[(row, col)] * singular_values[col];
        }
    }
    let projected = u;

    for (i, v) in vectors.iter_mut().enumerate() {
        v.0.truncate(N_COMPONENTS);
        let mut norm2 = 0.0;
        for (j, x) in v.0.iter_mut().enumerate() {
            *x = projected[(i, j)];
            norm2 += *x * *x;
        }
        let norm = norm2.sqrt();
        for x in v.0.iter_mut() {
            *x /= norm;
        }
    }
}

pub fn needs_reembed(c: &Connection) -> Result<bool> {
    let mut stmt = c.prepare_cached("SELECT music_id as id2 FROM tags WHERE key=?1 AND 0 = (SELECT COUNT(1) FROM tags WHERE key=?2 AND music_id=id2) LIMIT 1;")?;
    let v = stmt.query_row([TagKey::FullEmbedding, TagKey::Embedding], |_| Ok(true));

    if let Err(rusqlite::Error::QueryReturnedNoRows) = v {
        return Ok(false);
    }

    v.context("failed checking reembed")
}
