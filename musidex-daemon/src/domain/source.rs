use crate::domain::entity::Source;
use anyhow::{Context, Result};
use tokio_postgres::Client;

pub async fn insert_source(c: &Client, source: Source) -> Result<()> {
    let v = c
        .execute(
            "
            INSERT INTO source (music_id, format, url)
            VALUES ($1, $2, $3)
            ON CONFLICT (music_id, format)
            DO UPDATE SET url=$3;",
            &[&source.music_id.0, &source.format, &source.url],
        )
        .await;
    let v = v.context("error inserting source")?;
    if v == 0 {
        bail!("no row updated")
    }
    Ok(())
}
