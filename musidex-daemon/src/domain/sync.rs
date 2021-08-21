use crate::domain::entity::MusidexMetadata;
use anyhow::Result;
use tokio_postgres::Client;

pub async fn fetch_metadata(c: &Client) -> Result<MusidexMetadata> {
    let (musics, tags, sources) = futures::join!(
        c.query("SELECT * FROM music", &[]),
        c.query("SELECT * FROM mtag", &[]),
        c.query("SELECT * FROM source", &[])
    );

    Ok(MusidexMetadata {
        musics: musics?.into_iter().map(Into::into).collect(),
        tags: tags?.into_iter().map(Into::into).collect(),
        sources: sources?.into_iter().map(Into::into).collect(),
    })
}
