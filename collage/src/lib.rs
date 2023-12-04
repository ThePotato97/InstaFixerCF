mod utils;

use image::{imageops::FilterType, RgbImage};
use web_sys::console;

use image::codecs::jpeg::JpegEncoder;
use wasm_bindgen::prelude::*;

use crate::mosaic::mosaic;

mod mosaic;
mod orientation;

fn array_to_image(array: &[u8]) -> RgbImage {
    orientation::fix_if_needed(array)
}

#[wasm_bindgen(start)]
pub fn setup() {
    utils::set_panic_hook();
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = performance)]
    fn now() -> f64;
}

#[wasm_bindgen]
pub fn create_mosaic(image_arrays: Vec<js_sys::Uint8Array>) -> Vec<u8> {
    console_error_panic_hook::set_once();

    // Add this line:
    // tracing_wasm::set_as_global_default();
    // converting to rgb image
    console::log_1(&"converting to rgb images".into());
    let images: Vec<RgbImage> = image_arrays
        .into_iter()
        .enumerate()
        .map(|(i, image_array)| {
            console::group_collapsed_1(&format!("processing image {}", i + 1).into());
            console::time();
            let result = array_to_image(&image_array.to_vec());
            console::time_end();
            console::group_end();
            result
        })
        .collect();
    console::log_1(&"converting to rgb images".into());

    console::log_1(&"converting to mosaic".into());
    let target = mosaic(images);
    console::log_1(&"done converting to mosaic".into());

    let mut jpg_buffer: Vec<u8> = vec![];
    let mut jpg_encoder = JpegEncoder::new(&mut jpg_buffer);
    jpg_encoder.encode_image(&target).unwrap();
    console::log_1(&"encoding end result".into());

    jpg_buffer
}
