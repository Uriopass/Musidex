#[macro_use]
extern crate anyhow;

#[macro_use]
mod utils;

mod domain;
mod infrastructure;
#[cfg(test)]
mod tests;

use crate::domain::handlers;
use crate::infrastructure::tls::TlsConfigBuilder;
use crate::utils::env_or;
use anyhow::Context;
use domain::config;
use hyper::server::conn::AddrIncoming;
use hyper::Server;
use include_dir::{include_dir, Dir};
use infrastructure::db::Pg;
use infrastructure::migrate::migrate;
use infrastructure::router::Router;

static MIGRATIONS: Dir = include_dir!("migrations");

async fn start() -> anyhow::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();
    std::fs::create_dir_all("./storage/").context("could not create storage")?;

    let pg = Pg::connect().await.context("error connecting to pg")?;
    migrate(&pg, &MIGRATIONS)
        .await
        .context("error running migrations")?;

    config::init(&pg).await?;

    let mut router = Router::new();
    router
        .state(pg)
        .get("/api/metadata", handlers::metadata)
        .get("/api/config", handlers::get_config);

    let addr = ([127, 0, 0, 1], 3200).into();
    let incoming = AddrIncoming::bind(&addr).unwrap_or_else(|e| {
        panic!("error binding to {}: {}", addr, e);
    });

    let service = router.into_service();
    if env_or("USE_HTTPS", false) {
        let tls_accept = infrastructure::tls::TlsAcceptor::new(
            TlsConfigBuilder::new()
                .cert_path(env_or("CERT_PATH", "./cert.pem".to_string()))
                .key_path(env_or("CERT_KEY_PATH", "./cert.rsa".to_string()))
                .build()?,
            incoming,
        );
        let server = Server::builder(tls_accept).serve(service);
        println!("Listening on https://{}", addr);
        server.await?;
        return Ok(());
    }

    let server = Server::builder(incoming).serve(service);
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
