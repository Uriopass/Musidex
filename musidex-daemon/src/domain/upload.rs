use crate::domain::entity::{Music, MusicID, Tag, TagKey, UserID};
use crate::infrastructure::youtube_dl::{ytdl_run_with_args, SingleVideo, YoutubeDlOutput};
use anyhow::{Context, Result};
use hyper::StatusCode;
use rusqlite::Connection;

pub async fn youtube_upload(c: &mut Connection, url: String, uid: UserID) -> Result<StatusCode> {
    let metadata = ytdl_run_with_args(vec!["--no-playlist", "-J", "--", &url])
        .await
        .context("error downloading metadata")?;
    let mut v = match metadata {
        YoutubeDlOutput::Playlist(_) => return Ok(StatusCode::BAD_REQUEST),
        YoutubeDlOutput::SingleVideo(v) => v,
    };
    if let Some(mid) = id_exists(c, &v.id)? {
        let k = TagKey::UserLibrary(s!(uid));
        if Tag::has(&c, mid, k.clone())? {
            return Ok(StatusCode::CONFLICT);
        }
        Tag::insert(&c, Tag::new_key(mid, k.clone()))?;
        return Ok(StatusCode::OK);
    }
    let wp = v.webpage_url.take().context("no webpage url")?;
    let tx = c.transaction()?;
    push_for_treatment(&tx, v, wp, uid).context("error pushing for treatment")?;
    tx.commit()?;
    Ok(StatusCode::OK)
}

fn id_exists(c: &Connection, id: &str) -> Result<Option<MusicID>> {
    Ok(Tag::by_text(c, id)
        .context("error getting ids")?
        .into_iter()
        .find_map(|t| {
            if t.key == TagKey::YoutubeDLVideoID && t.text.as_deref() == Some(id) {
                return Some(t.music_id);
            }
            None
        }))
}

fn push_for_treatment(c: &Connection, v: Box<SingleVideo>, url: String, uid: UserID) -> Result<()> {
    let id = Music::mk(&c)?;

    let mk_tag = |key, v| Tag::insert(&c, Tag::new_text(id, key, v));

    let (title, artist) = parse_title(&v.title, &v);
    mk_tag(TagKey::YoutubeDLURL, url)?;
    mk_tag(TagKey::YoutubeDLVideoID, v.id)?;
    mk_tag(TagKey::YoutubeDLWorkerTreated, s!("false"))?;
    mk_tag(TagKey::Title, title)?;
    if let Some(v) = v.duration {
        Tag::insert(
            &c,
            Tag {
                music_id: id,
                key: TagKey::Duration,
                text: Some((v + 0.99).to_string()),
                integer: Some((v + 0.99) as i32),
                date: None,
                vector: None,
            },
        )?;
    }
    if let Some(p) = v.playlist_title {
        mk_tag(TagKey::YoutubeDLPlaylist, p)?;
    }
    if let Some(artist) = artist {
        mk_tag(TagKey::Artist, artist)?;
    }
    mk_tag(TagKey::YoutubeDLOriginalTitle, v.title)?;
    Tag::insert(&c, Tag::new_key(id, TagKey::UserLibrary(s!(uid))))?;
    Ok(())
}

lazy_static::lazy_static! {
    static ref OFFICIAL_REMOVER: regex::Regex = regex::RegexBuilder::new(r"(\(|\[)((official|video|hq|vidéo|officielle)\s?-?\s?)+(\]|\))").case_insensitive(true).build().unwrap();
}

// Returns title and artist from title
fn parse_title(title: &str, v: &SingleVideo) -> (String, Option<String>) {
    if let Some(d) = v.duration {
        if d > 20.0 * 60.0 {
            return (String::from(title), None);
        }
    }
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

pub async fn youtube_upload_playlist(
    c: &mut Connection,
    url: String,
    index_start: Option<usize>,
    index_stop: Option<usize>,
    uid: UserID,
) -> Result<(StatusCode, usize)> {
    let start = index_start.unwrap_or(0);
    let stop = index_stop.unwrap_or(0);
    if stop < start {
        return Ok((StatusCode::OK, 0));
    }

    let mut args = vec![];
    let starts;
    if start != 0 {
        args.push("--playlist-start");
        starts = start.to_string();
        args.push(&starts);
    }

    let stops;
    if stop != 0 {
        args.push("--playlist-end");
        stops = stop.to_string();
        args.push(&stops);
    }

    args.extend_from_slice(&["--flat-playlist", "--yes-playlist", "-J", "--"]);
    args.push(&url);

    let metadata = ytdl_run_with_args(args)
        .await
        .context("failed reading playlist metadata")?;

    match metadata {
        YoutubeDlOutput::Playlist(p) => {
            if p.entries.as_ref().map(|x| x.is_empty()).unwrap_or(true) {
                log::warn!("no entries in playlist");
            }
            let entries = match p.entries {
                Some(v) if v.len() > 0 => v,
                _ => {
                    log::warn!("no entries in playlist");
                    return Ok((StatusCode::OK, 0));
                }
            };
            let count = entries.len();
            for mut entry in entries.into_iter().rev() {
                if entry.ie_key.as_deref() != Some("Youtube") {
                    bail!("only yt playlist are supported at the moment");
                }
                if let Some(mid) = id_exists(c, &entry.id)? {
                    let k = TagKey::UserLibrary(s!(uid));
                    if Tag::has(&c, mid, k.clone())? {
                        log::info!("music from playlist was already in library: {}", &entry.id);
                        continue;
                    }
                    Tag::insert(&c, Tag::new_key(mid, k.clone()))?;
                    continue;
                }
                let tx = c.transaction()?;
                entry.playlist_title = p.title.clone();
                let url = entry.url.take().context("no url?")?;

                push_for_treatment(&tx, entry, url, uid)?;
                tx.commit()?;
            }
            return Ok((StatusCode::OK, count));
        }
        YoutubeDlOutput::SingleVideo(_) => {
            return Ok((StatusCode::BAD_REQUEST, 0));
        }
    }
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
