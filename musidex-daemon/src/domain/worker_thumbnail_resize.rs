use std::time::Duration;

use anyhow::{Context, Result};
use rusqlite::Connection;

use crate::domain::entity::{MusicID, Tag, TagKey};
use crate::infrastructure::db::Db;
use crate::utils::row_missing_opt;
use image::imageops::FilterType;
use image::{GenericImageView, ImageOutputFormat};

pub struct SmallThumbnailWorker {
    db: Db,
}

impl SmallThumbnailWorker {
    pub fn new(db: Db) -> Self {
        SmallThumbnailWorker { db }
    }

    pub fn start(mut self) {
        let _ = tokio::spawn(async move {
            loop {
                let v = self
                    .step()
                    .await
                    .context("error while running youtubedl worker");
                if let Err(e) = v {
                    log::error!("{:?}", e);
                }
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });
    }

    pub async fn step(&mut self) -> Result<()> {
        let c = self.db.get().await;
        let candidate = unwrap_ret!(find_candidate(&c)?, Ok(()));

        let thumb = unwrap_ret!(Tag::by_id_key(&c, candidate, TagKey::Thumbnail)?, Ok(()));
        let thumb_p = unwrap_ret!(thumb.text, Ok(()));

        let buf = tokio::fs::read(format!("storage/{}", thumb_p)).await?;
        let img = image::load_from_memory(&buf)?;

        let (w, h) = img.dimensions();
        if w < 256 && h <= 256 {
            log::info!(
                "thumbnail {:?} already fit within bound, using it as compressed thumbnail",
                candidate
            );
            Tag::insert(
                &c,
                Tag::new_text(candidate, TagKey::CompressedThumbnail, thumb_p),
            )?;
            return Ok(());
        }

        let img = img.resize(256, 256, FilterType::Lanczos3);

        let mut buf = vec![];
        img.write_to(&mut buf, ImageOutputFormat::Jpeg(70))?;
        let compressedfname = format!("compressed.{}", thumb_p);
        tokio::fs::write(&format!("storage/{}", compressedfname), &buf).await?;

        Tag::insert(
            &c,
            Tag::new_text(candidate, TagKey::CompressedThumbnail, compressedfname),
        )?;
        Ok(())
    }
}

pub fn find_candidate(c: &Connection) -> Result<Option<MusicID>> {
    let mut stmt = c.prepare_cached("SELECT music_id as id2 FROM tags WHERE key=?1 AND 0 = (SELECT COUNT(1) FROM tags WHERE key=?2 AND music_id=id2) LIMIT 1;")?;
    let v = stmt.query_row([TagKey::Thumbnail, TagKey::CompressedThumbnail], |x| {
        x.get("id2").map(MusicID).map(Some)
    });
    row_missing_opt(v).context("failed getting id")
}
