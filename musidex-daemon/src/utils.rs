use hyper::{Body, Response, StatusCode};
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;
use std::str::FromStr;

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

pub fn res_status(status: StatusCode) -> Response<Body> {
    let mut r = Response::new(Body::empty());
    *r.status_mut() = status;
    r
}

pub fn get_file_range<P: AsRef<Path>>(
    file_path: P,
    (start, end): (u64, u64),
) -> std::io::Result<Vec<u8>> {
    if end < start {
        return Err(std::io::Error::from(std::io::ErrorKind::InvalidInput));
    }
    let mut f = std::fs::File::open(file_path)?;
    let mut buffer = Vec::new();
    f.seek(SeekFrom::Start(start))?;
    BufReader::new(f)
        .take(end - start + 1)
        .read_to_end(&mut buffer)?;
    Ok(buffer)
}
