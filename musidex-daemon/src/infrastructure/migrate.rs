use crate::infrastructure::db::Db;
use crate::utils::collect_rows;
use anyhow::{Context, Result};
use include_dir::Dir;
use rusqlite::{Connection, ErrorCode};

fn get_migrated(pg: &Connection) -> Result<Vec<String>> {
    let mut stmt = match pg.prepare("SELECT migration FROM sqlx_pg_migrate ORDER BY id;") {
        Ok(x) => x,
        Err(rusqlite::Error::SqliteFailure(sqlite_err, msg)) => {
            if sqlite_err.code == ErrorCode::Unknown
                && msg
                    .as_ref()
                    .map(|v| v.starts_with("no such table"))
                    .unwrap_or(false)
            {
                return Ok(vec![]);
            } else {
                bail!("{:?}", msg.unwrap_or_default());
            }
        }
        Err(e) => Err(e)?,
    };
    let migrated = stmt.query_map([], |row| row.get("migration"))?;
    collect_rows(migrated)
}

/// Runs the migrations contained in the directory. See module documentation for
/// more information.
pub async fn migrate(pg: &Db, dir: &Dir<'_>) -> Result<()> {
    log::info!("running migrations");

    let mut client = pg.get().await;
    let migrated = get_migrated(&client).context("error getting migrations")?;
    log::info!("got existing migrations from table");

    let tx = client.transaction().context("error creating transaction")?;
    if migrated.is_empty() {
        log::info!("no migration table, creating it");

        tx.execute_batch(
            r#"
                CREATE TABLE IF NOT EXISTS sqlx_pg_migrate (
                    id SERIAL PRIMARY KEY,
                    migration TEXT UNIQUE,
                    created TIMESTAMP NOT NULL DEFAULT current_timestamp
                );
            "#,
        )
        .context("error creating migration table")?;
    }
    let mut files: Vec<_> = dir.files().collect();
    if migrated.len() > files.len() {
        bail!("some migrations were deleted")
    }
    files.sort_by(|a, b| a.path().partial_cmp(b.path()).unwrap());
    for (pos, f) in files.iter().enumerate() {
        let path = f.path().to_str().context("invalid path")?;

        if pos < migrated.len() {
            if migrated[pos] != path {
                bail!("migration is missing: {}", path)
            }
            continue;
        }
        log::info!("running and inserting migration: {}", path);

        let content = f.contents_utf8().context("invalid file content")?;
        tx.execute_batch(content)?;
        tx.execute(
            "INSERT INTO sqlx_pg_migrate (migration) VALUES ($1)",
            [&path],
        )
        .context("error running transaction")?;
    }
    tx.commit().context("error commiting transaction")?;
    log::info!("sucessfully ran migrations");
    Ok(())
}
