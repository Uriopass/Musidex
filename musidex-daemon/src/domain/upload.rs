use crate::domain::entity::{Music, Tag, TagKey};
use crate::infrastructure::youtube_dl::{ytdl_run_with_args, SingleVideo, YoutubeDlOutput};
use anyhow::{Context, Result};
use hyper::StatusCode;
use rusqlite::Connection;

pub async fn youtube_upload(c: &mut Connection, url: String) -> Result<StatusCode> {
    if Tag::by_text(&c, &url)?.len() > 0 {
        return Ok(StatusCode::CONFLICT);
    }

    let metadata = ytdl_run_with_args(vec!["-f", "bestaudio", "--no-playlist", "-J", &url])
        .await
        .context("error downloading metadata")?;
    let v = match metadata {
        YoutubeDlOutput::Playlist(_) => return Ok(StatusCode::BAD_REQUEST),
        YoutubeDlOutput::SingleVideo(v) => v,
    };
    if id_exists(c, &v.id)? {
        return Ok(StatusCode::CONFLICT);
    }
    let tx = c.transaction()?;
    push_for_treatment(&tx, v).context("error pushing for treatment")?;
    tx.commit()?;
    Ok(StatusCode::OK)
}

fn id_exists(c: &Connection, id: &str) -> Result<bool> {
    Ok(Tag::by_text(c, id)
        .context("error getting ids")?
        .into_iter()
        .any(|t| t.key == TagKey::YoutubeDLVideoID && t.text.as_deref() == Some(id)))
}

fn push_for_treatment(c: &Connection, v: SingleVideo) -> Result<()> {
    let id = Music::mk(&c)?;

    let mk_tag = |key, v| Tag::insert(&c, Tag::new_text(id, key, v));

    let (title, artist) = parse_title(&v.title, &v);
    mk_tag(TagKey::YoutubeDLURL, v.url.context("no url")?)?;
    mk_tag(TagKey::YoutubeDLVideoID, v.id)?;
    mk_tag(TagKey::YoutubeDLWorkerTreated, s!("false"))?;
    mk_tag(TagKey::Title, title)?;
    if let Some(p) = v.playlist_title {
        mk_tag(TagKey::YoutubeDLPlaylist, p)?;
    }
    if let Some(artist) = artist {
        mk_tag(TagKey::Artist, artist)?;
    }
    mk_tag(TagKey::YoutubeDLOriginalTitle, v.title)?;
    Ok(())
}

lazy_static::lazy_static! {
    static ref OFFICIAL_REMOVER: regex::Regex = regex::RegexBuilder::new(r"(\(|\[)((official|video|hq|vidéo|officielle)\s?-?\s?)+(\]|\))").case_insensitive(true).build().unwrap();
}

// Returns title and artist from title
fn parse_title(title: &str, v: &SingleVideo) -> (String, Option<String>) {
    if let (Some(track), Some(artist)) = (&v.track, &v.artist) {
        return (track.clone(), Some(artist.clone()));
    }
    let (mut gtrack, mut gartist) = guess_title(title);
    if let Some(ref x) = v.artist {
        gartist = Some(x.clone());
    }
    if let Some(ref x) = v.track {
        gtrack = x.clone();
    }

    (gtrack, gartist)
}

/// Guess track and artist from title
fn guess_title(title: &str) -> (String, Option<String>) {
    let title = OFFICIAL_REMOVER.replace_all(title, "");
    let title = title.trim();
    let sp: Vec<_> = title.splitn(2, " - ").collect();

    if sp.len() == 2 {
        let artist = sp[0].trim();
        let actual_title = sp[1].trim();

        if artist.is_empty() || actual_title.is_empty() {
            return (s!(title), None);
        }

        return (s!(actual_title), Some(s!(artist)));
    }
    (s!(title), None)
}

pub async fn youtube_upload_playlist(c: &mut Connection, url: String) -> Result<StatusCode> {
    let metadata = ytdl_run_with_args(vec!["--flat-playlist", "--yes-playlist", "-J", &url])
        .await
        .context("failed reading playlist metadata")?;

    match metadata {
        YoutubeDlOutput::Playlist(p) => {
            if p.entries.as_ref().map(|x| x.is_empty()).unwrap_or(true) {
                log::warn!("no entries in playlist");
            }
            for mut entry in p.entries.into_iter().flatten() {
                if id_exists(c, &entry.id)? {
                    log::info!("music from playlist was already in library: {}", &entry.id);
                    continue;
                }
                let tx = c.transaction()?;
                entry.playlist_title = p.title.clone();
                push_for_treatment(&tx, entry)?;
                tx.commit()?;
            }
        }
        YoutubeDlOutput::SingleVideo(_) => {
            return Ok(StatusCode::BAD_REQUEST);
        }
    }

    Ok(StatusCode::OK)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_official_remover_regex() {
        let should_match = &[
            "(Official)",
            "[Official]",
            "[Official - Video]",
            "(Video)",
            "[HQ]",
            "[HQ - Video]",
            "(official video)",
            "(official - video)",
        ];

        let should_not_match = &[
            "",
            "official",
            "official video",
            " - ",
            "(official",
            "official)",
            "Video",
            "(ft. Lil B)",
            "(homer)",
        ];

        for v in should_match {
            assert!(OFFICIAL_REMOVER.is_match(v), "should match: {}", v);
        }

        for v in should_not_match {
            assert!(!OFFICIAL_REMOVER.is_match(v), "should not match: {}", v);
        }
    }

    #[test]
    fn test_artist_split() {
        let should_split = &[
            (
                "Jamiroquai - Virtual Insanity (Official Video)",
                "Jamiroquai",
                "Virtual Insanity",
            ),
            (
                "Earth, Wind & Fire - September (Official Video)",
                "Earth, Wind & Fire",
                "September",
            ),
            (
                "Breakbot - Baby I'm Yours (feat. Irfane) [Official Video]",
                "Breakbot",
                "Baby I'm Yours (feat. Irfane)",
            ),
            (" a - b ", "a", "b"),
            ("a - b", "a", "b"),
            (" a - b - c ", "a", "b - c"),
        ];

        let should_not_split = &[
            "Baby I'm Yours (feat. Irfane)",
            "Mr. Blue. Sky",
            "a -",
            "-",
            "a-a",
            "a -ba",
            "a- ba",
            "Princess Mononoke Suite「03. TA-TA-RI-GAMI (The Demon God)」",
            "",
        ];

        for (title, artist, track) in should_split {
            let (gtrack, gartist) = guess_title(title);
            assert_eq!(&*gtrack, *track);
            assert_eq!(&*gartist.unwrap(), *artist);
        }

        for v in should_not_split {
            let (gtrack, gartist) = guess_title(v);
            assert!(gartist.is_none());
            assert_eq!(&*gtrack, *v);
        }
    }
}
