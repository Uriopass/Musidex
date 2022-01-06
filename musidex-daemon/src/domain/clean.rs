use std::time::Duration;

use anyhow::Result;
use rusqlite::TransactionBehavior;

use crate::domain::entity::{Music, MusicID, Tag};
use crate::infrastructure::db::Db;

pub struct Cleaner {
    db: Db,
}

impl Cleaner {
    pub async fn clean(&self) -> Result<()> {
        let mut c = self.db.get().await;

        c.execute("PRAGMA locking_mode = EXCLUSIVE", &[])?;
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

        tokio::time::sleep(Duration::from_secs_f32(0.01)).await;

        Ok(())
    }
}
