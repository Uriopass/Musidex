#[macro_use]
extern crate anyhow;

#[macro_use]
mod utils;

mod domain;
mod infrastructure;
#[cfg(test)]
mod tests;

use crate::domain::handlers;
use anyhow::Context;
use domain::config;
use hyper::Server;
use include_dir::{include_dir, Dir};
use infrastructure::db::Pg;
use infrastructure::migrate::migrate;
use infrastructure::router::Router;

static MIGRATIONS: Dir = include_dir!("migrations");
static DB_URL: &'static str = "postgresql://postgres:pass@127.0.0.1:5433/musidex";

async fn start() -> anyhow::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    migrate(DB_URL, &MIGRATIONS)
        .await
        .context("error running migrations")?;

    let pg = Pg::connect()?;
    config::init(&pg).await?;

    let mut router = Router::new();
    router
        .state(pg)
        .get("/api/metadata", handlers::metadata)
        .get("/api/config", handlers::get_config);

    let addr = ([127, 0, 0, 1], 3000).into();
    let server = Server::bind(&addr).serve(router.into_service());

    println!("Listening on http://{}", addr);

    server.await?;

    Ok(())
}

fn main() -> anyhow::Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(start())
}
