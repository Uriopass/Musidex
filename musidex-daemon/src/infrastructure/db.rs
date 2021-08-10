use crate::utils::env_or;
use anyhow::{Context, Result};
use deadpool_postgres::tokio_postgres::NoTls;
use deadpool_postgres::{Client, Config, ManagerConfig, RecyclingMethod};

#[derive(Clone)]
pub struct Pg(deadpool_postgres::Pool);

impl Pg {
    pub fn connect() -> Result<Pg> {
        let mut cfg = Config::new();
        cfg.user = Some("postgres".to_string());
        cfg.dbname = Some("musidex".to_string());
        cfg.password = Some(env_or("DB_PASS", "pass".to_string()));
        cfg.port = Some(env_or("DB_PORT", 5433));
        cfg.host = Some(env_or("DB_URL", "localhost".to_string()));
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });
        let pool = cfg.create_pool(NoTls).context("can't create pool")?;
        Ok(Pg(pool))
    }

    pub async fn get(&self) -> Result<Client> {
        self.0.get().await.context("failed getting connection")
    }
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
