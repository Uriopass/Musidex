use crate::domain::entity::MusicID;
use anyhow::{Context, Result};
use tokio_postgres::Client;

pub async fn mk_music(tx: &Client) -> Result<MusicID> {
    let v = tx
        .query("INSERT INTO music DEFAULT VALUES RETURNING id;", &[])
        .await?;
    let v = v.get(0).context("failed inserting")?;
    let id = v.get("id");
    Ok(MusicID(id))
}
