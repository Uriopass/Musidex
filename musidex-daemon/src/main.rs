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

// see https://github.com/actix/examples/blob/master/basics/basics/src/main.rs

/// simple index handler
#[get("/welcome")]
async fn welcome(req: HttpRequest, data: web::Data<Arc<Mutex<i32>>>) -> Result<HttpResponse> {
        println!("{:?}", req);

        let mut g = data.lock().unwrap();
        *g += 1;
        let v = *g;
        drop(g);

        // response
        Ok(HttpResponse::build(StatusCode::OK)
            .content_type("text/html; charset=utf-8")
            .body(format!("Hello, world! {}",  v)))
}

static MIGRATIONS: Dir = include_dir!("migrations");
static DB_URL: &'static str = "postgresql://postgres:pass@127.0.0.1:5433/";

#[actix_web::main]
async fn main() -> io::Result<()> {
        env::set_var("RUST_LOG", "actix_web=debug,actix_server=info");
        env_logger::init();

        migrate(DB_URL, &MIGRATIONS).await.unwrap();

        let v = Arc::new(Mutex::new(0i32));
        HttpServer::new(move || {
                App::new()
                    .data(v.clone())
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
                                .header(header::LOCATION, "/welcome")
                                .finish()
                    })))
        })
            .bind("127.0.0.1:8080")?
            .run()
            .await
}