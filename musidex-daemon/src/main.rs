#[macro_use]
extern crate anyhow;

#[macro_use]
mod utils;

mod application;
mod domain;
mod infrastructure;
#[cfg(test)]
mod tests;

use crate::application::{handlers, user_handlers};
use crate::domain::clean::clean;
use crate::domain::config;
use crate::domain::sync::SyncBroadcast;
use crate::domain::worker_embedding_dimreduce::EmbeddingReduceWorker;
use crate::domain::worker_neural_embed::NeuralEmbedWorker;
use crate::domain::worker_thumbnail_resize::SmallThumbnailWorker;
use crate::domain::worker_youtube_dl::YoutubeDLWorker;
use crate::infrastructure::db::Db;
use crate::infrastructure::migrate::migrate;
use crate::infrastructure::router::{RequestExt, Router};
use crate::utils::env_or;
use anyhow::Context;
use hyper::server::conn::AddrIncoming;
use hyper::{Body, Request, Response, Server};
use include_dir::{include_dir, Dir};

pub static MIGRATIONS: Dir = include_dir!("migrations");

async fn start() -> anyhow::Result<()> {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }
    env_logger::init();
    log::info!("initializing musidex");
    std::fs::create_dir_all("./storage/").context("could not create storage")?;

    let db = Db::connect().await.context("error connecting to pg")?;
    migrate(&db, &MIGRATIONS)
        .await
        .context("error running migrations")?;

    config::init(&db).await?;

    let ytdl_worker = YoutubeDLWorker::new(db.clone());
    let neuralembed_worker = NeuralEmbedWorker::new(db.clone());
    let small_thumbnail_worker = SmallThumbnailWorker::new(db.clone());
    let embedding_dimreduce_worker = EmbeddingReduceWorker::new(db.clone());
    let (broadcast, sub) = SyncBroadcast::new()?;

    let mut router = Router::new();
    router
        .state(db)
        .state(sub)
        .get("/api/restart_server", move |_| {
            std::process::exit(77);
            #[allow(unreachable_code)]
            async {
                Ok(Response::new(Body::empty()))
            }
        })
        .get("/api/metadata", handlers::metadata)
        .get("/api/metadata_extension", handlers::metadata_extension)
        .get("/api/metadata/compressed", handlers::metadata_compressed)
        .get("/api/ping", handlers::ping)
        .get("/api/metadata/ws", handlers::subscribe_sync)
        .post("/api/clean", move |r: Request<Body>| async move {
            clean(r.state::<Db>()).await?;
            Ok(Response::new(Body::empty()))
        })
        .post("/api/config/update", handlers::update_config)
        .post("/api/youtube_upload", handlers::youtube_upload)
        .post(
            "/api/youtube_upload/playlist",
            handlers::youtube_upload_playlist,
        )
        .get("/api/stream/:musicid", handlers::stream)
        .delete("/api/music/:id", handlers::delete_music_handler)
        .post("/api/music/retry_errors", handlers::retry_on_error)
        .post("/api/music/merge", handlers::merge_music)
        .post("/api/tag/create", handlers::create_tag)
        .delete("/api/tag", handlers::delete_tag)
        .put("/api/putontop/:id", handlers::put_on_top)
        .post("/api/user/create", user_handlers::create)
        .post("/api/user/update/:id", user_handlers::update)
        .delete("/api/user/:id", user_handlers::delete)
        .static_files("/storage/", "./storage/")
        .static_files("/", "./web/")
        .index_html(&["/users", "/settings", "/merge", "/music_map", "/explorer"])
        .nocors(env_or("NO_CORS", false));

    let port = env_or("PORT", 3200);
    let addr = ([0, 0, 0, 0], port).into();
    let incoming =
        AddrIncoming::bind(&addr).with_context(|| format!("error binding to {}", addr))?;
    let service = router.into_service();

    ytdl_worker.start();
    neuralembed_worker.start();
    small_thumbnail_worker.start();
    embedding_dimreduce_worker.start();
    broadcast.start_workers();

    let server = Server::builder(incoming).serve(service);
    println!("Listening on http://{}", addr);
    server.await?;
    Ok(())
}

fn main() -> anyhow::Result<()> {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(start())
}
