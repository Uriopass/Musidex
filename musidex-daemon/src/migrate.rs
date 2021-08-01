use include_dir::Dir;
use sqlx::postgres::PgRow;
use sqlx::{Connection, Executor, PgConnection, Row};
use thiserror::Error;

/// The various kinds of errors that can arise when running the migrations.
#[derive(Error, Debug)]
pub enum Error {
    #[error("expected migration `{0}` to already have been run")]
    MissingMigration(String),

    #[error("invalid URL `{0}`: could not determine DB name")]
    InvalidURL(String),

    #[error("error connecting to existing database: {}", .source)]
    ExistingConnectError { source: sqlx::Error },

    #[error("error connecting to base URL `{}` to create DB: {}", .url, .source)]
    BaseConnect { url: String, source: sqlx::Error },

    #[error("error finding current migrations: {}", .source)]
    CurrentMigrations { source: sqlx::Error },

    #[error("invalid utf-8 bytes in migration content: {0}")]
    InvalidMigrationContent(std::path::PathBuf),

    #[error("invalid utf-8 bytes in migration path: {0}")]
    InvalidMigrationPath(std::path::PathBuf),

    #[error("more migrations run than are known indicating possibly deleted migrations")]
    DeletedMigrations,

    #[error(transparent)]
    DB(#[from] sqlx::Error),
}

type Result<T> = std::result::Result<T, Error>;

fn base_and_db(url: &str) -> Result<(&str, &str)> {
    let base_split: Vec<&str> = url.rsplitn(2, '/').collect();
    if base_split.len() != 2 {
        return Err(Error::InvalidURL(url.to_string()));
    }
    let qmark_split: Vec<&str> = base_split[0].splitn(2, '?').collect();
    Ok((base_split[1], qmark_split[0]))
}

async fn maybe_make_db(url: &str) -> Result<()> {
    match PgConnection::connect(url).await {
        Ok(_) => return Ok(()), // it exists, we're done
        Err(err) => {
            if let sqlx::Error::Database(dberr) = err {
                // this indicates the database doesn't exist
                if let Some("3D000") = dberr.code().as_deref() {
                    Ok(()) // it doesn't exist, continue to create it
                } else {
                    Err(Error::ExistingConnectError {
                        source: sqlx::Error::Database(dberr),
                    })
                }
            } else {
                Err(Error::ExistingConnectError { source: err })
            }
        }
    }?;

    let (base_url, db_name) = base_and_db(url)?;
    let mut db = match PgConnection::connect(&format!("{}/postgres", base_url)).await {
        Ok(db) => db,
        Err(err) => {
            return Err(Error::BaseConnect {
                url: base_url.to_string(),
                source: err,
            })
        }
    };
    sqlx::query(&format!(r#"CREATE DATABASE "{}""#, db_name))
        .execute(&mut db)
        .await?;
    Ok(())
}

async fn get_migrated(db: &mut PgConnection) -> Result<Vec<String>> {
    let migrated = sqlx::query("SELECT migration FROM sqlx_pg_migrate ORDER BY id")
        .try_map(|row: PgRow| row.try_get("migration"))
        .fetch_all(db)
        .await;
    match migrated {
        Ok(migrated) => Ok(migrated),
        Err(err) => {
            if let sqlx::Error::Database(dberr) = err {
                // this indicates the table doesn't exist
                if let Some("42P01") = dberr.code().as_deref() {
                    Ok(vec![])
                } else {
                    Err(Error::CurrentMigrations {
                        source: sqlx::Error::Database(dberr),
                    })
                }
            } else {
                Err(Error::CurrentMigrations { source: err })
            }
        }
    }
}

/// Runs the migrations contained in the directory. See module documentation for
/// more information.
pub async fn migrate(url: &str, dir: &Dir<'_>) -> Result<()> {
    maybe_make_db(url).await?;
    let mut db = PgConnection::connect(url).await?;
    let migrated = get_migrated(&mut db).await?;
    let mut tx = db.begin().await?;
    if migrated.is_empty() {
        sqlx::query(
            r#"
                CREATE TABLE IF NOT EXISTS sqlx_pg_migrate (
                    id SERIAL PRIMARY KEY,
                    migration TEXT UNIQUE,
                    created TIMESTAMP NOT NULL DEFAULT current_timestamp
                );
            "#,
        )
        .execute(&mut tx)
        .await?;
    }
    let mut files: Vec<_> = dir.files().iter().collect();
    if migrated.len() > files.len() {
        return Err(Error::DeletedMigrations);
    }
    files.sort_by(|a, b| a.path().partial_cmp(b.path()).unwrap());
    for (pos, f) in files.iter().enumerate() {
        let path = f
            .path()
            .to_str()
            .ok_or_else(|| Error::InvalidMigrationPath(f.path().to_owned()))?;

        if pos < migrated.len() {
            if migrated[pos] != path {
                return Err(Error::MissingMigration(path.to_owned()));
            }
            continue;
        }

        let content = f
            .contents_utf8()
            .ok_or_else(|| Error::InvalidMigrationContent(f.path().to_owned()))?;
        tx.execute(content).await?;
        sqlx::query("INSERT INTO sqlx_pg_migrate (migration) VALUES ($1)")
            .bind(path)
            .execute(&mut tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}
