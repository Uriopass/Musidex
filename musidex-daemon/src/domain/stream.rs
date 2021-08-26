use crate::domain::entity::TagKey::{LocalM4A, LocalMP3, LocalOGG, LocalWEBM};
use crate::domain::entity::{MusicID, Tag};
use crate::infrastructure::db::Client;
use crate::utils::get_file_range;
use anyhow::{Context, Result};
use hyper::http::HeaderValue;

pub struct MusicMetadata {
    pub buf: Vec<u8>,
    pub range_size: (u64, u64, u64),
    pub content_type: &'static str,
}

pub async fn stream_music(
    c: Client<'_>,
    id: MusicID,
    range: Option<&HeaderValue>,
) -> Result<MusicMetadata> {
    let mut source_path = None;
    {
        let tags = Tag::by_id(&c, id)?;

        for tag in tags {
            if (tag.key == LocalMP3
                || tag.key == LocalOGG
                || tag.key == LocalM4A
                || tag.key == LocalWEBM)
                && tag.text.is_some()
            {
                source_path = tag.text;
                break;
            }
        }
    }
    let source_path = source_path.context("no streamable source found")?;

    let content_type = if source_path.ends_with("mp3") {
        "audio/mpeg"
    } else if source_path.ends_with("ogg") {
        "audio/ogg"
    } else if source_path.ends_with("m4a") {
        "audio/mp4"
    } else if source_path.ends_with("webm") {
        "audio/webm"
    } else {
        ""
    };

    let file_path = format!("./storage/{}", source_path);

    if let Some(rangev) = range {
        let range = http_range::HttpRange::parse_bytes(rangev.as_bytes(), u32::MAX as u64)
            .map_err(|_| anyhow!("could not decode range"))?;
        log::info!(
            "asked with range {:?}: {}",
            range[0],
            rangev.to_str().unwrap()
        );
        let r = range.get(0).context("no ranges")?;
        let (buf, len) = get_file_range(file_path, (r.start, r.start + r.length)).await?;
        let range_size = (
            r.start,
            (r.start + r.length)
                .saturating_sub(1)
                .min(len.saturating_sub(1)),
            len,
        );
        return Ok(MusicMetadata {
            buf,
            range_size,
            content_type,
        });
    }

    let buf = tokio::fs::read(file_path)
        .await
        .context("failed reading source")?;

    let l = buf.len() as u64;
    let range_size = (0, l.saturating_sub(1), l);
    Ok(MusicMetadata {
        buf,
        range_size,
        content_type,
    })
}
