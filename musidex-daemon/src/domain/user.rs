use hyper::{Body, Request};

pub struct UserID(i32);

impl UserID {
    pub fn from_req(req: &Request<Body>) -> UserID {
        UserID(1)
    }
}

impl ToString for UserID {
    fn to_string(&self) -> String {
        self.0.to_string()
    }
}
