use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {}

/// Performs t-SNE.
///
/// # Arguments
///
/// * `x` - `&mut [T]` containing the data to embed. `T` must implement `num_traits::Float`.
///
/// * `n`- `usize` that represents the number of `d`-dimensional points in `x`.
///
/// * `d` - `usize` that represents the dimension of each point.
///
/// * `y` - `&mut [T]` where to store the resultant embedding.
///
/// * `no_dims` - `usize` that represents the dimension of the embedded points.
///
/// * `perplexity` - `T` representing perplexity value.
///
/// * `theta` - `T` representing the theta value. If `theta` is set to `0.0` the __exact__ version of t-SNE will be used,
/// if set to greater values the __Barnes-Hut__ version will be used instead.
///
/// * `skip_random_init` - `bool` stating whether to skip the random initialization of `y`.
/// In most cases it should be set to `false`.
///
/// * `max_iter` -` u64` indicating the maximum number of fitting iterations.
///
/// * `stop_lying_iter` - `u64` indicating the number of the iteration after which the P distribution
/// values become _“true“_. one fourth of max_iter.
///
/// * `mom_switch_iter` - `u64` indicating the number of the iteration after which the momentum's value is
/// set to its final value. one fourth of max_iter.
#[wasm_bindgen]
pub fn run_tsne(
    mut data: Vec<f64>,
    n: usize,
    d: usize,
    y_dim: usize,
    mut perplexity: f64,
    theta: f64,
    skip_random_init: bool,
    max_iter: u32,
) -> Vec<f64> {
    perplexity = perplexity.min((n - 1) as f64 / 3.1);
    let mut y = vec![0.0; n * y_dim];
    let max_iter = max_iter as u64;
    bhtsne::run(
        &mut data,
        n,
        d,
        &mut y,
        y_dim,
        perplexity,
        theta,
        skip_random_init,
        max_iter,
        max_iter / 4,
        max_iter / 4,
    );
    y
}
