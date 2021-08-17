use anyhow::{Context, Result};
use deadpool_postgres::tokio_postgres::error::SqlState;
use deadpool_postgres::tokio_postgres::{Client, Row};
use include_dir::Dir;
use crate::infrastructure::db::Pg;

async fn get_migrated(pg: &Client) -> Result<Vec<String>> {
    let migrated = pg
        .query("SELECT migration FROM sqlx_pg_migrate ORDER BY id;", &[])
        .await
        .map(|x| x.into_iter().map(|row: Row| row.get("migration")).collect());
    match migrated {
        Ok(migrated) => Ok(migrated),
        Err(err) => {
            if let Some(&SqlState::UNDEFINED_TABLE) = err.code() {
                Ok(vec![])
            } else {
                bail!("error, cant get current migrations")
            }
        }
    }
}

/// Runs the migrations contained in the directory. See module documentation for
/// more information.
pub async fn migrate(pg: &Pg, dir: &Dir<'_>) -> Result<()> {
    log::info!("running migrations");

    let mut client = pg.get().await?;
    let migrated = get_migrated(&client)
        .await
        .context("error getting migrations")?;
    log::info!("got existing migrations from table");

    let tx = client
        .transaction()
        .await
        .context("error creating transaction")?;
    if migrated.is_empty() {
        log::info!("no migration table, creating it");

        tx.execute(
            r#"
                CREATE TABLE IF NOT EXISTS sqlx_pg_migrate (
                    id SERIAL PRIMARY KEY,
                    migration TEXT UNIQUE,
                    created TIMESTAMP NOT NULL DEFAULT current_timestamp
                );
            "#,
            &[],
        )
        .await
        .context("error creating migration table")?;
    }
    let mut files: Vec<_> = dir.files().iter().collect();
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
        tx.batch_execute(content).await?;
        tx.execute(
            "INSERT INTO sqlx_pg_migrate (migration) VALUES ($1)",
            &[&path],
        )
        .await
        .context("error running transaction")?;
    }
    tx.commit().await.context("error commiting transaction")?;
    log::info!("sucessfully ran migrations");
    Ok(())
}
