use anyhow::Result;
use hyper::{Body, Response, StatusCode};
use std::path::Path;
use std::str::FromStr;
use tokio::io::{AsyncReadExt, AsyncSeekExt, BufReader, SeekFrom};

pub fn env_or<T: FromStr>(key: &str, default: T) -> T {
    match std::env::var(key) {
        Ok(x) => x.parse().unwrap_or(default),
        Err(_) => default,
    }
}

macro_rules! unwrap_cont {
    ($e: expr) => {
        match $e {
            Some(x) => x,
            None => continue,
        }
    };
}

macro_rules! s {
    ($e: expr) => {
        $e.to_string()
    };
}

pub fn collect_rows<T, E>(rows: impl Iterator<Item = Result<T, E>>) -> Result<Vec<T>>
where
    E: std::error::Error + Send + Sync + 'static,
{
    let mut vec = vec![];
    for val in rows {
        vec.push(val?);
    }
    Ok(vec)
}

pub fn res_status(status: StatusCode) -> Response<Body> {
    let mut r = Response::new(Body::empty());
    *r.status_mut() = status;
    r
}

pub async fn get_file_range<P: AsRef<Path>>(
    file_path: P,
    (start, end): (u64, u64),
) -> tokio::io::Result<(Vec<u8>, u64)> {
    if end < start {
        return Err(std::io::Error::from(std::io::ErrorKind::InvalidInput));
    }
    let mut f = tokio::fs::File::open(file_path).await?;
    let tot_size = f.metadata().await?.len();
    let mut buffer = Vec::new();
    f.seek(SeekFrom::Start(start)).await?;
    BufReader::new(f)
        .take(end - start)
        .read_to_end(&mut buffer)
        .await?;
    Ok((buffer, tot_size))
}
