mod migrate;

use actix_web::http::{header, Method, StatusCode};
use actix_web::web::Data;
use actix_web::{error, get, middleware, web, App, HttpRequest, HttpResponse, HttpServer, Result};
use include_dir::{include_dir, Dir};
use migrate::migrate;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, Row};
use std::sync::{Arc, Mutex};
use std::{env, io};

type MyPool = Pool<Postgres>;

/// simple index handler
#[get("/welcome")]
async fn welcome(req: HttpRequest, pool: Data<MyPool>) -> Result<HttpResponse> {
    // response
    Ok(HttpResponse::build(StatusCode::OK)
        .content_type("text/html; charset=utf-8")
        .body(format!("Hello, world! {}", 3)))
}

static MIGRATIONS: Dir = include_dir!("migrations");
static DB_URL: &'static str = "postgresql://postgres:pass@127.0.0.1:5433/musidex";

#[actix_web::main]
async fn main() -> io::Result<()> {
    env::set_var("RUST_LOG", "actix_web=info,actix_server=info,info");
    env_logger::init();

    migrate(DB_URL, &MIGRATIONS).await.unwrap();

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(DB_URL)
        .await
        .unwrap();

    HttpServer::new(move || {
        App::new()
            .app_data(Data::new(pool.clone()))
            // enable logger - always register actix-web Logger middleware last
            .wrap(middleware::Logger::default())
            // register simple route, handle all methods
            .service(welcome)
            .service(
                web::resource("/testa").to(|req: HttpRequest| match *req.method() {
                    Method::GET => HttpResponse::Ok(),
                    Method::POST => HttpResponse::MethodNotAllowed(),
                    _ => HttpResponse::NotFound(),
                }),
            )
            .service(web::resource("/error").to(|| async {
                error::InternalError::new(
                    io::Error::new(io::ErrorKind::Other, "test"),
                    StatusCode::INTERNAL_SERVER_ERROR,
                )
            }))
            // redirect
            .service(web::resource("/").route(web::get().to(|req: HttpRequest| {
                println!("{:?}", req);
                HttpResponse::Found()
                    .append_header((header::LOCATION, "/welcome"))
                    .finish()
            })))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
