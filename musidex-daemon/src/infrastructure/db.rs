use crate::utils::env_or;
use anyhow::{Context, Result};
use deadpool_postgres::{Client, Config, ManagerConfig, PoolError, RecyclingMethod};
use tokio_postgres::error::SqlState;
use tokio_postgres::NoTls;

#[derive(Clone)]
pub struct Pg(deadpool_postgres::Pool);

impl Pg {
    pub async fn connect() -> Result<Pg> {
        let mut cfg = Config::new();
        cfg.user = Some(env_or("DB_USER", "postgres".to_string()));
        cfg.dbname = Some("musidex".to_string());
        cfg.password = Some(env_or("DB_PASS", "pass".to_string()));
        cfg.port = Some(env_or("DB_PORT", 5433));
        cfg.host = Some(env_or("DB_URL", "localhost".to_string()));
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });
        let pool = Pg(cfg.create_pool(NoTls).context("can't create pool")?);
        maybe_make_db(cfg, &pool)
            .await
            .context("error trying to make db")?;
        Ok(pool)
    }

    pub async fn get(&self) -> Result<Client> {
        self.0.get().await.context("failed getting connection")
    }
}

async fn maybe_make_db(mut cfg: Config, pool: &Pg) -> Result<()> {
    match pool.0.get().await {
        Ok(_) => return Ok(()), // it exists, we're done
        Err(PoolError::Backend(err)) => {
            if let Some(&SqlState::UNDEFINED_DATABASE) = err.code() {
                () // it doesn't exist, continue to create it
            } else {
                return Err(err).context("could not connect to db");
            }
        }
        Err(err) => return Err(err).context("could not connect to db"),
    };

    cfg.dbname = Some("postgres".to_string());
    let pool = cfg.create_pool(NoTls).context("can't create pool")?;
    let client = pool.get().await?;

    client.execute("CREATE DATABASE musidex", &[]).await?;
    Ok(())
}

#[cfg(test)]
impl Pg {
    pub async fn clean(&self) -> Result<()> {
        let v = self.get().await?;
        let (a, b, c, d) = futures::join!(
            v.query("TRUNCATE music CASCADE", &[]),
            v.query("TRUNCATE mtag CASCADE", &[]),
            v.query("TRUNCATE config CASCADE", &[]),
            v.query("TRUNCATE source CASCADE", &[])
        );
        a?;
        b?;
        c?;
        d?;
        Ok(())
    }
}
