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
