use anyhow::{Context, Result};
use deadpool_postgres::tokio_postgres::error::SqlState;
use deadpool_postgres::tokio_postgres::{Client, NoTls, Row};
use include_dir::Dir;

fn base_and_db(url: &str) -> Result<(&str, &str)> {
    let base_split: Vec<&str> = url.rsplitn(2, '/').collect();
    if base_split.len() != 2 {
        bail!("invalid url: {}", url)
    }
    let qmark_split: Vec<&str> = base_split[0].splitn(2, '?').collect();
    Ok((base_split[1], qmark_split[0]))
}

async fn maybe_make_db(url: &str) -> Result<()> {
    match deadpool_postgres::tokio_postgres::connect(url, NoTls).await {
        Ok(_) => return Ok(()), // it exists, we're done
        Err(err) => {
            if let Some(&SqlState::UNDEFINED_DATABASE) = err.code() {
                () // it doesn't exist, continue to create it
            } else {
                return Err(err).context("could not connect to db");
            }
        }
    };

    let (base_url, db_name) = base_and_db(url)?;
    let (client, connection) =
        deadpool_postgres::tokio_postgres::connect(&format!("{}/postgres", base_url), NoTls)
            .await?;
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });
    client
        .execute(&*format!(r#"CREATE DATABASE "{}""#, db_name), &[])
        .await?;
    Ok(())
}

async fn get_migrated(db: &mut Client) -> Result<Vec<String>> {
    let migrated = db
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
pub async fn migrate(url: &str, dir: &Dir<'_>) -> Result<()> {
    log::info!("running migrations");
    maybe_make_db(url)
        .await
        .context("error checking db exists")?;
    log::info!("database exists");

    let (mut db, connection) = deadpool_postgres::tokio_postgres::connect(url, NoTls)
        .await
        .context("error connecting to db")?;
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let migrated = get_migrated(&mut db)
        .await
        .context("error getting migrations")?;
    log::info!("got existing migrations from table");

    let tx = db
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
