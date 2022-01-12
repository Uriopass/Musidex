use std::time::Duration;

use anyhow::Result;
use rusqlite::TransactionBehavior;

use crate::domain::entity::{Music, MusicID};
use crate::infrastructure::db::Db;
use std::collections::HashSet;

pub async fn clean(db: &Db) -> Result<()> {
    let mut c = db.get().await;

    {
        let tx = c.transaction_with_behavior(TransactionBehavior::Exclusive)?;

        for lone_music in tx
            .prepare(
                "
        SELECT id FROM musics
        WHERE id NOT IN (
        SELECT music_id FROM tags
        LEFT JOIN musics
        WHERE tags.music_id = musics.id
          AND tags.key LIKE 'user_library%'
          GROUP BY musics.id)",
            )?
            .query_map([], |x| x.get::<&str, i32>("id"))?
        {
            Music::delete(&tx, MusicID(lone_music?))?;
        }

        tx.commit()?;
    }
    tokio::time::sleep(Duration::from_secs_f32(0.01)).await;

    let tx = c.transaction_with_behavior(TransactionBehavior::Exclusive)?;
    let texts = tx
        .prepare("SELECT text FROM tags WHERE text IS NOT NULL")?
        .query_map([], |x| x.get::<&str, String>("text"))?
        .collect::<std::result::Result<HashSet<_>, _>>()?;

    for file in std::fs::read_dir("storage")? {
        let file = unwrap_cont!(file.ok());
        let ftype = unwrap_cont!(file.file_type().ok());
        if !ftype.is_file() {
            continue;
        }
        let fname = file.file_name();
        let name = fname.to_string_lossy();
        if !(name.ends_with(".mp3") || name.ends_with(".jpg")) {
            continue;
        }
        if texts.contains(&*name) {
            continue;
        }
        log::info!(
            "cleaning {:?}: {:?}",
            name,
            std::fs::remove_file(file.path())
        );
    }

    tx.commit()?;

    Ok(())
}
