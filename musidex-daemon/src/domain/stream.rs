use crate::domain::entity::{MusicID, Source};
use anyhow::Result;
use deadpool_postgres::tokio_postgres::Client;

pub async fn stream_path(c: &Client, id: MusicID) -> Result<String> {
    let sources = c
        .query("SELECT * FROM source WHERE music_id=$1", &[&id.0])
        .await?;

    for row in sources {
        let source = Source::from(row);
        if source.format == "local_mp3"
            || source.format == "local_ogg"
            || source.format == "local_m4a"
        {
            return Ok(source.url);
        }
    }

    Err(anyhow!("no streamable source found"))
}
