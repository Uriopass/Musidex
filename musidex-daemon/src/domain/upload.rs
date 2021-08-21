use crate::domain::entity::{Source, Tag};
use crate::domain::{music, source, tags};
use anyhow::Result;
use hyper::StatusCode;
use tokio_postgres::Client;

pub async fn youtube_upload(c: &mut Client, url: String) -> Result<StatusCode> {
    if tags::tags_by_text(&c, &url).await?.len() > 0 {
        return Ok(StatusCode::CONFLICT);
    }

    let tx = c.transaction().await?;
    let id = music::mk_music(tx.client()).await?;

    source::insert_source(
        tx.client(),
        Source {
            music_id: id,
            format: "youtube_url".to_string(),
            url: url.clone(),
        },
    )
    .await?;

    tags::insert_tag(
        tx.client(),
        Tag::new_text(id, "youtube_url".to_string(), url),
    )
    .await?;

    tx.commit().await?;
    Ok(StatusCode::OK)
}
