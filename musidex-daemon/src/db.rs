use anyhow::{Result, Context};
use deadpool_postgres::tokio_postgres::NoTls;
use deadpool_postgres::{Client, Config, ManagerConfig, RecyclingMethod};

#[derive(Clone)]
pub struct Pg(deadpool_postgres::Pool);

impl Pg {
    pub fn connect() -> Result<Pg> {
        let mut cfg = Config::new();
        cfg.user = Some("postgres".to_string());
        cfg.dbname = Some("musidex".to_string());
        cfg.password = Some("pass".to_string());
        cfg.port = Some(5433);
        cfg.host = Some("127.0.0.1".to_string());
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
