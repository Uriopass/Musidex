use super::*;
use crate::domain::entity::Source;
use crate::domain::music::mk_music;
use crate::domain::sync::fetch_metadata;
use anyhow::Result;

#[test_env_log::test(tokio::test)]
pub async fn test_insert_source() -> Result<()> {
    let db = mk_db().await?;
    let c = db.get().await;
    let mid = mk_music(&c)?;

    let source = Source {
        music_id: mid,
        format: s!("youtube_url"),
        url: s!("yes"),
    };

    crate::domain::source::insert_source(&c, source.clone())?;

    let metadata = fetch_metadata(&c)?;

    assert_eq!(metadata.sources[0], source);

    Ok(())
}
