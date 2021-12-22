//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use tsne_wasm::run_tsne;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn pass() {
    let data = vec![1.0, 1.0, 2.0, 2.0];
    let lol = run_tsne(data, 2, 2, 1, 0.5, 0.5, false, 10);
    assert_eq!(lol.len(), 2);
    println!("{:?}", &lol);
}
