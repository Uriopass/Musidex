// Partly based on https://github.com/giraffate/keiro/blob/master/src/lib.rs
// MIT License
//
// Copyright (c) 2021 Takayuki Nakata
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, pub(crate)lish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

use anyhow::Context as _c;
use anyhow::Result;
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll};

use crate::utils::res_status;
use futures::FutureExt;
use hyper::body::Bytes;
use hyper::header::{
    HeaderValue, ACCEPT_ENCODING, ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_METHODS,
    ACCESS_CONTROL_ALLOW_ORIGIN, CACHE_CONTROL, CONTENT_ENCODING, CONTENT_TYPE, COOKIE, ORIGIN,
    USER_AGENT,
};
use hyper::http::Extensions;
use hyper::service::Service;
use hyper::{Body, Method, Request, Response, StatusCode};
use route_recognizer::Router as InnerRouter;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use tokio::time::Instant;

#[derive(Default)]
pub(crate) struct Router {
    inner: HashMap<Method, InnerRouter<Box<dyn Handler>>>,
    not_found: Option<Box<dyn Handler>>,
    state: Arc<Extensions>,
    nocors: bool,
}

#[allow(dead_code)]
impl Router {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    pub(crate) fn state<T: Send + Sync + 'static>(&mut self, v: T) -> &mut Self {
        Arc::get_mut(&mut self.state)
            .expect("state is being shared yet it's trying to be added")
            .insert(v);
        self
    }

    pub(crate) fn nocors(&mut self, nocors: bool) -> &mut Self {
        self.nocors = nocors;
        self
    }

    pub(crate) fn static_files(&mut self, path: &str, dir_location: &str) -> &mut Self {
        let dir_location = PathBuf::from(dir_location);
        let h = StaticHandle { dir_location };
        if !path.ends_with("/") {
            panic!("path must end with /")
        }
        let mut v = path.to_string();
        v.push_str("*fileurl");
        self.get(&v, h);

        self
    }

    /// Register a handler for GET requests
    pub(crate) fn get<H>(&mut self, path: &str, handler: H) -> &mut Self
    where
        H: Handler,
    {
        let entry = self
            .inner
            .entry(Method::GET)
            .or_insert_with(InnerRouter::new);
        entry.add(path, Box::new(handler));
        self
    }

    /// Register a handler for POST requests
    pub fn post<H>(&mut self, path: &str, handler: H) -> &mut Self
    where
        H: Handler,
    {
        let entry = self
            .inner
            .entry(Method::POST)
            .or_insert_with(InnerRouter::new);
        entry.add(path, Box::new(handler));
        self
    }

    /// Register a handler for PUT requests
    pub fn put<H>(&mut self, path: &str, handler: H)
    where
        H: Handler,
    {
        let entry = self
            .inner
            .entry(Method::PUT)
            .or_insert_with(InnerRouter::new);
        entry.add(path, Box::new(handler));
    }

    /// Register a handler for DELETE requests
    pub fn delete<H>(&mut self, path: &str, handler: H) -> &mut Self
    where
        H: Handler,
    {
        let entry = self
            .inner
            .entry(Method::DELETE)
            .or_insert_with(InnerRouter::new);
        entry.add(path, Box::new(handler));
        self
    }

    /// Register a handler when no routes are matched
    pub fn not_found<H>(&mut self, handler: H)
    where
        H: Handler,
    {
        self.not_found = Some(Box::new(handler));
    }

    pub(crate) fn serve(
        &self,
        mut req: Request<Body>,
    ) -> Pin<Box<dyn Future<Output = Result<Response<Body>>> + Send>> {
        if req.uri().path() == "/" {
            return Box::pin(async { serve_file("./web/index.html".as_ref()).await });
        }
        match self.inner.get(req.method()) {
            Some(inner_router) => match inner_router.recognize(req.uri().path()) {
                Ok(matcher) => {
                    let handler = matcher.handler();
                    let params = matcher.params().clone();
                    let cookies: Option<Cookies> = req
                        .headers()
                        .get(COOKIE)
                        .and_then(|x| Some(parse_cookies(x.to_str().ok()?)))
                        .map(|x| Cookies(x.map(|(name, value)| (s!(name), s!(value))).collect()));
                    req.extensions_mut().insert(Params(Some(Box::new(params))));
                    if let Some(cookies) = cookies {
                        req.extensions_mut().insert(cookies);
                    }
                    req.extensions_mut().insert(self.state.clone());
                    let wants_compression = req
                        .headers()
                        .get(ACCEPT_ENCODING)
                        .and_then(|x| x.to_str().ok())
                        .map(|x| x.contains("deflate"))
                        .unwrap_or(false);
                    let f = handler.call(req);
                    if !wants_compression {
                        return f;
                    }
                    Box::pin(f.then(|r| async {
                        match r {
                            Ok(x) => {
                                let (mut parts, b) = x.into_parts();
                                let bytes = hyper::body::to_bytes(b).await?;

                                let bytes =
                                    Bytes::from(miniz_oxide::deflate::compress_to_vec(&*bytes, 3));

                                let b = Body::from(bytes);

                                parts
                                    .headers
                                    .insert(CONTENT_ENCODING, HeaderValue::from_static("deflate"));
                                Ok(Response::from_parts(parts, b))
                            }
                            Err(e) => Err(e),
                        }
                    }))
                }
                Err(_) => match &self.not_found {
                    Some(handler) => {
                        req.extensions_mut().insert(Params(None));
                        handler.call(req)
                    }
                    None => Box::pin(async {
                        Ok(Response::builder().status(404).body(Body::empty()).unwrap())
                    }),
                },
            },
            None => {
                Box::pin(async { Ok(Response::builder().status(404).body(Body::empty()).unwrap()) })
            }
        }
    }

    pub(crate) fn into_service(self) -> MakeRouterService<RouterService> {
        MakeRouterService {
            inner: RouterService::new(self),
        }
    }
}

fn parse_cookies(x: &str) -> impl Iterator<Item = (&str, &str)> {
    x.split("; ").into_iter().filter_map(|x| {
        let v = x.find("=")?;
        Some((&x[..v], x.get(v + 1..)?))
    })
}

#[derive(Debug)]
pub struct Cookies(pub HashMap<String, String>);

pub struct StaticHandle {
    dir_location: PathBuf,
}

impl Handler for StaticHandle {
    fn call(
        &self,
        req: Request<Body>,
    ) -> Pin<Box<dyn Future<Output = Result<Response<Body>>> + Send>> {
        let url = req.params().get("fileurl").unwrap_or("index.html");
        log::info!("serving file: {}", url);
        let mut p = self.dir_location.clone();
        p.push(url);
        let should_cache = url.ends_with("jpg")
            || url.ends_with("png")
            || url.ends_with("woff2")
            || url.ends_with("js")
            || url.ends_with("wasm")
            || url.ends_with("css");
        let is_wasm = url.ends_with("wasm");
        Box::pin((move || async move {
            let mut r = serve_file(&p).await?;
            if is_wasm {
                r.headers_mut()
                    .insert(CONTENT_TYPE, "application/wasm".parse().unwrap());
            }
            if should_cache {
                r.headers_mut().insert(
                    CACHE_CONTROL,
                    "public, max-age=604800, immutable".parse().unwrap(),
                );
            }
            Ok(r)
        })())
    }
}

async fn serve_file(p: &Path) -> Result<Response<Body>> {
    let f = match tokio::fs::read(p).await {
        Ok(x) => x,
        Err(e) => {
            if e.kind() == ErrorKind::NotFound {
                return Ok(res_status(StatusCode::NOT_FOUND));
            }
            return Err(e).context("failed reading file");
        }
    };

    return Ok(Response::new(Body::from(f)));
}

pub(crate) trait Handler: Send + Sync + 'static {
    fn call(
        &self,
        req: Request<Body>,
    ) -> Pin<Box<dyn Future<Output = Result<Response<Body>>> + Send>>;
}

impl<F: Send + Sync + 'static, R> Handler for F
where
    F: Fn(Request<Body>) -> R + Send + Sync,
    R: Future<Output = Result<Response<Body>>> + Send + 'static,
{
    fn call(
        &self,
        req: Request<Body>,
    ) -> Pin<Box<dyn Future<Output = Result<Response<Body>>> + Send>> {
        Box::pin(self(req))
    }
}

impl fmt::Debug for dyn Handler {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "keiro::Handler")
    }
}

#[derive(Clone)]
pub(crate) struct RouterService(Arc<Router>);

impl Service<Request<Body>> for RouterService {
    type Response = Response<Body>;
    type Error = anyhow::Error;
    #[allow(clippy::type_complexity)]
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let t = Instant::now();
        let router = self.0.clone();
        let uagent = req
            .headers()
            .get(USER_AGENT)
            .and_then(|x| x.to_str().ok())
            .unwrap_or("unknown user agent")
            .to_string();
        let origin = req
            .headers()
            .get(ORIGIN)
            .and_then(|x| x.to_str().ok())
            .unwrap_or("unknown user agent")
            .to_string();

        let nocors = router.nocors;
        let route = Arc::new(req.uri().to_string());
        let route2 = route.clone();
        let fut = router.serve(req);
        let fut = async move {
            #[allow(unused_mut)]
            let mut response = match fut.await {
                Ok(x) => x,
                Err(e) => {
                    let e = e.context(format!("got error in request for route {}", &*route));
                    log::error!("{:?}", e);
                    Response::builder()
                        .status(500)
                        .body(Body::from(format!("{}", e)))
                        .unwrap()
                }
            };
            if nocors {
                set_nocors(&mut response);
            } else {
                set_defaultcors(&mut response);
            }
            Ok(response)
        };
        log::info!(
            "[{:.2}ms] seeing req at {} for {}",
            1000.0 * t.elapsed().as_secs_f32(),
            &*route2,
            uagent,
        );
        Box::pin(fut)
    }
}

fn set_nocors(req: &mut Response<Body>) {
    req.headers_mut()
        .insert(ACCESS_CONTROL_ALLOW_ORIGIN, "*".parse().unwrap());
    req.headers_mut()
        .insert(ACCESS_CONTROL_ALLOW_CREDENTIALS, "true".parse().unwrap());
    req.headers_mut().insert(
        ACCESS_CONTROL_ALLOW_METHODS,
        "GET, POST, OPTIONS".parse().unwrap(),
    );
}

fn set_defaultcors(origin: &str, req: &mut Response<Body>) {
    if origin.starts_with("https://www.youtube.com") || origin.starts_with("https://youtube.com") {
        req.headers_mut()
            .insert(ACCESS_CONTROL_ALLOW_ORIGIN, origin.parse().unwrap());
        req.headers_mut()
            .insert(ACCESS_CONTROL_ALLOW_CREDENTIALS, "true".parse().unwrap());
        req.headers_mut().insert(
            ACCESS_CONTROL_ALLOW_METHODS,
            "GET, POST, OPTIONS".parse().unwrap(),
        );
    }
}

impl RouterService {
    pub(crate) fn new(router: Router) -> Self {
        Self(Arc::new(router))
    }
}

pub(crate) struct MakeRouterService<Svc> {
    pub(crate) inner: Svc,
}

impl<T, Svc> Service<T> for MakeRouterService<Svc>
where
    Svc: Service<Request<Body>> + Clone,
    Svc::Response: 'static,
    Svc::Error: Into<Box<dyn Error + Send + Sync>>,
    Svc::Future: 'static,
{
    type Response = Svc;
    type Error = Box<dyn Error + Send + Sync>;
    type Future = Ready<Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, _req: T) -> Self::Future {
        Ready(Some(Ok(self.inner.clone())))
    }
}

pub(crate) struct Ready<T>(Option<T>);

impl<T> Future for Ready<T> {
    type Output = T;

    #[inline]
    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<T> {
        Poll::Ready(self.0.take().expect("Ready polled after completion"))
    }
}

impl<T> Unpin for Ready<T> {}

#[derive(Debug)]
pub struct Params(Option<Box<route_recognizer::Params>>);

impl Params {
    pub(crate) fn get(&self, key: &str) -> Option<&str> {
        self.0.as_ref()?.find(key)
    }
}

pub trait RequestExt {
    fn params(&self) -> &Params;
    fn cookies(&self) -> Option<&Cookies>;
    fn state<T: Send + Sync + 'static>(&self) -> &T;
}

impl RequestExt for Request<Body> {
    fn params(&self) -> &Params {
        self.extensions().get::<Params>().unwrap()
    }

    fn cookies(&self) -> Option<&Cookies> {
        self.extensions().get::<Cookies>()
    }

    fn state<T: Send + Sync + 'static>(&self) -> &T {
        self.extensions()
            .get::<Arc<Extensions>>()
            .unwrap()
            .get::<T>()
            .expect("state was not added to router")
    }
}
