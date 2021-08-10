macro_rules! unwrap_ret {
    ($e: expr, $ret: expr) => {
        match $e {
            Ok(x) => x,
            Err(err) => return $ret(err),
        }
    };
}

mod config;
mod handlers;
mod migrate;
mod router;
mod db;

use crate::handlers::hello_test;
use crate::router::Router;
use anyhow::Context;
use hyper::Server;
use include_dir::{include_dir, Dir};
use migrate::migrate;
use db::Pg;

#[macro_use]
extern crate anyhow;

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
    router.state(pg).get("/:id", hello_test);

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
