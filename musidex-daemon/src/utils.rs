use anyhow::Result;
use hyper::{Body, Response, StatusCode};
use rusqlite::{MappedRows, Row};
use std::path::Path;
use std::str::FromStr;
use tokio::io::{AsyncReadExt, AsyncSeekExt, BufReader, SeekFrom};

pub fn env_or<T: FromStr>(key: &str, default: T) -> T {
    match std::env::var(key) {
        Ok(x) => x.parse().unwrap_or(default),
        Err(_) => default,
    }
}

#[allow(unused_macros)]
macro_rules! unwrap_ret {
    ($e: expr, $ret: expr) => {
        match $e {
            Ok(x) => x,
            Err(err) => return $ret(err),
        }
    };
}

pub fn collect_rows<T, F>(rows: MappedRows<F>) -> Result<Vec<T>>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<T>,
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
) -> std::io::Result<Vec<u8>> {
    if end < start {
        return Err(std::io::Error::from(std::io::ErrorKind::InvalidInput));
    }
    let mut f = tokio::fs::File::open(file_path).await?;
    let mut buffer = Vec::new();
    f.seek(SeekFrom::Start(start)).await?;
    BufReader::new(f)
        .take(end - start + 1)
        .read_to_end(&mut buffer)
        .await?;
    Ok(buffer)
}
