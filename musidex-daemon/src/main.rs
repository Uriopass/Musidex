#[macro_use]
extern crate anyhow;

#[macro_use]
mod utils;

mod application;
mod domain;
mod infrastructure;
#[cfg(test)]
mod tests;

use crate::application::handlers;
use crate::domain::config;
use crate::domain::youtube_dl_worker::YoutubeDLWorker;
use crate::infrastructure::db::Db;
use crate::infrastructure::migrate::migrate;
use crate::infrastructure::router::Router;
use crate::infrastructure::tls::TlsConfigBuilder;
use crate::utils::env_or;
use anyhow::Context;
use hyper::server::conn::AddrIncoming;
use hyper::Server;
use include_dir::{include_dir, Dir};

pub static MIGRATIONS: Dir = include_dir!("migrations");

async fn start() -> anyhow::Result<()> {
    // Init
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();
    std::fs::create_dir_all("./storage/").context("could not create storage")?;

    let db = Db::connect().await.context("error connecting to pg")?;
    migrate(&db, &MIGRATIONS)
        .await
        .context("error running migrations")?;

    config::init(&db).await?;

    let ytdl_worker = YoutubeDLWorker::new(db.clone());

    let mut router = Router::new();
    router
        .state(db)
        .get("/api/metadata", handlers::metadata)
        .post("/api/youtube_upload", handlers::youtube_upload)
        .get("/api/stream/:musicid", handlers::stream)
        .get("/api/config", handlers::get_config)
        .delete("/api/music/:id", handlers::delete_music)
        .static_files("/", "./web/");

    let addr = ([127, 0, 0, 1], 3200).into();
    let incoming = AddrIncoming::bind(&addr).unwrap_or_else(|e| {
        panic!("error binding to {}: {}", addr, e);
    });

    let service = router.into_service();

    // Run
    if env_or("USE_HTTPS", false) {
        let tls_accept = infrastructure::tls::TlsAcceptor::new(
            TlsConfigBuilder::new()
                .cert_path(env_or("CERT_PATH", s!("./cert.pem")))
                .key_path(env_or("CERT_KEY_PATH", s!("./cert.rsa")))
                .build()?,
            incoming,
        );
        let server = Server::builder(tls_accept).serve(service);
        println!("Listening on https://{}", addr);
        server.await?;
        return Ok(());
    }

    ytdl_worker.start();
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
