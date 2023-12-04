use exif::{In, Tag};
use image::{imageops, RgbImage};
use std::io::Cursor;
use web_sys::console;

pub fn fix_if_needed(raw_image: &[u8]) -> RgbImage {
    let orientation = get_orientation(raw_image);

    console::time_with_label("converting into RgbImage");
    let image = image::load_from_memory(raw_image).unwrap().into_rgb8();
    console::time_end_with_label("converting into RgbImage");

    match orientation {
        Ok(orientation_tag) => fix_orientation(image, orientation_tag),
        Err(reason) => {
            log_reason_for_no_orientation_fix(reason);
            image
        }
    }
}

#[derive(Debug)]
enum NoFixNeededReason {
    AlreadyCorrect,
    ParsingError(String),
    NoExif,
    NoOrientationTag,
    InvalidOrientationTagValue(Option<u32>),
}

fn get_orientation(raw_image: &[u8]) -> Result<u32, NoFixNeededReason> {
    let reader = exif::Reader::new();
    let mut cursor = Cursor::new(&raw_image);
    let exif_data = reader
        .read_from_container(&mut cursor)
        .map_err(|err| match err {
            exif::Error::NotFound(_) => NoFixNeededReason::NoExif,
            _ => NoFixNeededReason::ParsingError(format!("{:?}", err)),
        })?;
    let exif_field = exif_data
        .get_field(Tag::Orientation, In::PRIMARY)
        .ok_or(NoFixNeededReason::NoOrientationTag)?;

    match exif_field.value.get_uint(0) {
        Some(1) => Err(NoFixNeededReason::AlreadyCorrect),
        Some(value @ 2..=8) => Ok(value),
        other => Err(NoFixNeededReason::InvalidOrientationTagValue(other)),
    }
}

fn log_reason_for_no_orientation_fix(reason: NoFixNeededReason) {
    use NoFixNeededReason::*;

    let log_function = match reason {
        AlreadyCorrect | NoExif | NoOrientationTag => console::log_1,
        ParsingError(_) | InvalidOrientationTagValue(_) => console::error_1,
    };

    log_function(&format!("{:?}", reason).into());
}

// Naive implementation until I figure out how to use transformation matrices with the image crate.
fn fix_orientation(mut image: RgbImage, orientation: u32) -> RgbImage {
    console::time_with_label("fixing orientation");

    if orientation > 8 {
        return image;
    }

    if orientation >= 5 {
        image = imageops::rotate90(&image);
        imageops::flip_horizontal_in_place(&mut image);
    }

    if orientation == 3 || orientation == 4 || orientation == 7 || orientation == 8 {
        imageops::rotate180_in_place(&mut image);
    }

    if orientation % 2 == 0 {
        imageops::flip_horizontal_in_place(&mut image);
    }

    console::time_end_with_label("fixing orientation");

    image
}
