mod migrate;

use actix_web::http::{header, Method, StatusCode};
use actix_web::{
        error, get,  middleware, web, App, HttpRequest, HttpResponse,
        HttpServer, Result,
};
use std::{env, io};
use std::sync::{Mutex, Arc};
use migrate::migrate;
use include_dir::{include_dir, Dir};
use actix_web::web::Data;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{Postgres, Pool, Row};

type MyPool = Pool<Postgres>;

/// simple index handler
#[get("/welcome")]
async fn welcome(req: HttpRequest, pool: Data<MyPool>) -> Result<HttpResponse> {
        println!("{:?}", req);

        let v = incr_and_get(&*pool).await;

        // response
        Ok(HttpResponse::build(StatusCode::OK)
            .content_type("text/html; charset=utf-8")
            .body(format!("Hello, world! {}",  v)))
}

async fn incr_and_get(pool: &MyPool) -> i32 {
        sqlx::query("\
        INSERT INTO test (id, value) \
        VALUES (1, 1)\
        ON CONFLICT (id) DO UPDATE \
        SET value = test.value+1\
        RETURNING value;")
            .fetch_one(pool)
            .await
            .unwrap()
            .try_get("value")
            .unwrap()
}

static MIGRATIONS: Dir = include_dir!("migrations");
static DB_URL: &'static str = "postgresql://postgres:pass@127.0.0.1:5433/musidex";

#[actix_web::main]
async fn main() -> io::Result<()> {
        env::set_var("RUST_LOG", "actix_web=warn,actix_server=warn,warn");
        env_logger::init();

        migrate(DB_URL, &MIGRATIONS).await.unwrap();

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(DB_URL).await.unwrap();

        let v = Arc::new(Mutex::new(0i32));
        HttpServer::new(move || {
                App::new()
                    .app_data(Data::new(v.clone()))
                    .app_data(Data::new(pool.clone()))
                    // enable logger - always register actix-web Logger middleware last
                    .wrap(middleware::Logger::default())
                    // register simple route, handle all methods
                    .service(welcome)
                    .service(
                            web::resource("/test").to(|req: HttpRequest| match *req.method() {
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