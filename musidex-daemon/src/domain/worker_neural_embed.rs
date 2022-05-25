use crate::infrastructure::db::Db;
use crate::utils::collect_rows;
use anyhow::{Context, Result};
use rusqlite::Connection;
use std::io::Read;
use std::process::{Command, Stdio};
use std::time::Duration;

pub struct NeuralEmbedWorker {
    db: Db,
}

impl NeuralEmbedWorker {
    pub fn new(db: Db) -> Self {
        NeuralEmbedWorker { db }
    }

    pub fn start(mut self) {
        let _ = tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(5)).await;
                let v = self
                    .step()
                    .await
                    .context("error while running neural worker");
                if let Err(e) = v {
                    log::error!("{:?}", e);
                }
            }
        });
    }

    pub async fn step(&mut self) -> Result<()> {
        let g = self.db.get().await;
        if !needs_embedding(&g)? {
            return Ok(());
        }

        log::info!("some musics need embeddings");

        tokio::task::spawn_blocking(move || {
            let args = vec!["musidex-neuralembed/neuralembed.py"];

            let mut child = Command::new("python3")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .args(args)
                .spawn()
                .context("error starting youtube-dl, did you install it?")?;

            let mut exit_code = None;
            for _ in 0..5 * 60 {
                exit_code = child.try_wait().context("error while waiting for python")?;
                if exit_code.is_some() {
                    break;
                }
                std::thread::sleep(Duration::from_secs(1));
            }

            if exit_code.is_none() {
                log::error!("timeouted vectorizing... killing python");
                child.kill().context("failed killing python")?;
                return Ok(());
            }

            if exit_code.unwrap().success() {
                Ok(())
            } else {
                let mut stderr = vec![];
                if let Some(mut reader) = child.stderr {
                    reader.read_to_end(&mut stderr)?;
                }
                let stderr = String::from_utf8(stderr).unwrap_or_default();
                Err(anyhow!(
                    "error using python: code: {} stderr:\n{}",
                    exit_code.unwrap().code().unwrap_or(1),
                    stderr,
                ))
            }
        })
        .await??;
        log::info!("done!");
        Ok(())
    }
}

pub fn needs_embedding(c: &Connection) -> Result<bool> {
    let mut v = c.prepare_cached(
        "
    SELECT * FROM musics
    WHERE 
        (SELECT COUNT(1) FROM tags 
         WHERE music_id = id AND key='embedding') = 0
    AND
        (SELECT COUNT(1) FROM tags 
         WHERE music_id = id AND key='local_mp3') = 1
    AND
        (SELECT COUNT(1) FROM tags 
         WHERE music_id = id AND key='duration' AND integer>30*60) = 0
    LIMIT 1;
    ",
    )?;
    let v = v.query([])?.mapped(|row| row.get(0));
    let v: Vec<i32> = collect_rows(v)?;

    Ok(v.len() > 0)
}
