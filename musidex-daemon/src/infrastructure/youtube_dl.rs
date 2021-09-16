use anyhow::{Context, Result};
use nanoserde::{DeJson, DeJsonState, SerJson, SerJsonState};

#[derive(Debug)]
pub enum YoutubeDlOutput {
    Playlist(Box<Playlist>),
    SingleVideo(Box<SingleVideo>),
}

/*
#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Chapter {
    pub end_time: Option<f64>,
    pub start_time: Option<f64>,
    pub title: Option<String>,
}

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Comment {
    pub author: Option<String>,
    pub author_id: Option<String>,
    pub html: Option<String>,
    pub id: Option<String>,
    pub parent: Option<String>,
    pub text: Option<String>,
    pub timestamp: Option<i64>,
}

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Format {
    pub abr: Option<f64>,
    pub acodec: Codec,
    pub asr: Option<f64>,
    pub container: Option<String>,
    //pub downloader_options: Option<BTreeMap<String, Value>>,
    pub ext: Option<String>,
    pub filesize: Option<f64>,
    pub filesize_approx: Option<String>,
    pub format: Option<String>,
    pub format_id: Option<String>,
    pub format_note: Option<String>,
    pub fps: Option<f64>,
    pub fragment_base_url: Option<String>,
    pub fragments: Option<Vec<Fragment>>,
    pub height: Option<i64>,
    //pub http_headers: Option<BTreeMap<String, Option<String>>>,
    pub language: Option<String>,
    pub language_preference: Option<i64>,
    pub manifest_url: Option<String>,
    pub no_resume: Option<bool>,
    pub player_url: Option<String>,
    //pub preference: Option<Value>,
    pub protocol: Option<Protocol>,
    pub quality: Option<i64>,
    pub resolution: Option<String>,
    pub source_preference: Option<i64>,
    pub stretched_ratio: Option<f64>,
    pub tbr: Option<f64>,
    pub url: Option<String>,
    pub vbr: Option<f64>,
    pub vcodec: Codec,
    pub width: Option<i64>,
}*/

#[derive(Clone, Debug, Default)]
pub struct Codec(Option<String>);

impl SerJson for Codec {
    fn ser_json(&self, d: usize, s: &mut SerJsonState) {
        self.0.ser_json(d, s)
    }
}

// Codec values are set explicitly, and when there is no codec, it is sometimes
// given as "none" (instead of simply missing from the JSON).
// Default decoding in this case would result in `Some("none".to_string())`, which is why
// this custom parse function exists.
impl DeJson for Codec {
    fn de_json(state: &mut DeJsonState, input: &mut Chars) -> Result<Self, nanoserde::DeJsonErr> {
        let v: Option<String> = DeJson::de_json(state, input)?;
        Ok(Codec(v.filter(|x| x != "none")))
    }
}

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Fragment {
    //pub duration: Option<Value>,
    pub filesize: Option<i64>,
    pub path: Option<String>,
    pub url: Option<String>,
}

/*
#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct JsonOutput {
    pub age_limit: Option<i64>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub album_type: Option<String>,
    pub alt_title: Option<String>,
    pub artist: Option<String>,
    //pub automatic_captions: Option<BTreeMap<String, Vec<Subtitle>>>,
    //pub average_rating: Option<Value>,
    pub categories: Option<Vec<Option<String>>>,
    pub channel: Option<String>,
    pub channel_id: Option<String>,
    pub channel_url: Option<String>,
    pub chapter: Option<String>,
    pub chapter_id: Option<String>,
    pub chapter_number: Option<String>,
    //pub chapters: Option<Vec<Chapter>>,
    pub comment_count: Option<i64>,
    //pub comments: Option<Vec<Comment>>,
    pub creator: Option<String>,
    pub description: Option<String>,
    pub disc_number: Option<i64>,
    pub dislike_count: Option<i64>,
    pub display_id: Option<String>,
    //pub duration: Option<Value>,
    pub end_time: Option<String>,
    pub episode: Option<String>,
    pub episode_id: Option<String>,
    pub episode_number: Option<i32>,
    pub extractor: Option<String>,
    pub extractor_key: Option<String>,
    //pub formats: Option<Vec<Format>>,
    pub genre: Option<String>,
    pub id: String,
    pub is_live: Option<bool>,
    pub license: Option<String>,
    pub like_count: Option<i64>,
    pub location: Option<String>,
    pub playlist: Option<String>,
    pub playlist_id: Option<String>,
    //pub playlist_index: Option<Value>,
    pub playlist_title: Option<String>,
    pub playlist_uploader: Option<String>,
    pub playlist_uploader_id: Option<String>,
    pub release_date: Option<String>,
    pub release_year: Option<i64>,
    pub repost_count: Option<i64>,
    //pub requested_subtitles: Option<BTreeMap<String, Subtitle>>,
    pub season: Option<String>,
    pub season_id: Option<String>,
    pub season_number: Option<i32>,
    pub series: Option<String>,
    pub start_time: Option<String>,
    //pub subtitles: Option<BTreeMap<String, Option<Vec<Subtitle>>>>,
    pub tags: Option<Vec<Option<String>>>,
    pub thumbnail: Option<String>,
    pub thumbnails: Option<Vec<Thumbnail>>,
    pub timestamp: Option<i64>,
    pub title: String,
    pub track: Option<String>,
    pub track_id: Option<String>,
    pub track_number: Option<String>,
    pub upload_date: Option<String>,
    pub uploader: Option<String>,
    pub uploader_id: Option<String>,
    pub uploader_url: Option<String>,
    pub view_count: Option<i64>,
    pub webpage_url: Option<String>,
}*/

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Playlist {
    pub entries: Option<Vec<Box<SingleVideo>>>,
    pub extractor: Option<String>,
    pub extractor_key: Option<String>,
    pub id: Option<String>,
    pub title: Option<String>,
    //pub uploader: Option<String>,
    //pub uploader_id: Option<String>,
    //pub uploader_url: Option<String>,
    pub webpage_url: Option<String>,
    pub webpage_url_basename: Option<String>,
}

#[derive(Clone, SerJson, DeJson, Debug)]
pub struct SingleVideo {
    //pub abr: Option<f64>,
    //pub acodec: Option<String>,
    //pub age_limit: Option<i64>,
    //pub album: Option<String>,
    //pub album_artist: Option<String>,
    //pub album_type: Option<String>,
    //pub alt_title: Option<String>,
    pub artist: Option<String>,
    //pub asr: Option<f64>,
    //pub automatic_captions: Option<BTreeMap<String, Vec<Subtitle>>>,
    //pub average_rating: Option<Value>,
    //pub categories: Option<Vec<Option<String>>>,
    //pub channel: Option<String>,
    //pub channel_id: Option<String>,
    //pub channel_url: Option<String>,
    //pub chapter: Option<String>,
    //pub chapter_id: Option<String>,
    //pub chapter_number: Option<String>,
    //pub chapters: Option<Vec<Chapter>>,
    //pub comment_count: Option<i64>,
    //pub comments: Option<Vec<Comment>>,
    //pub container: Option<String>,
    //pub creator: Option<String>,
    //pub description: Option<String>,
    //pub disc_number: Option<i64>,
    //pub dislike_count: Option<i64>,
    //pub display_id: Option<String>,
    //pub downloader_options: Option<BTreeMap<String, Value>>,
    pub duration: Option<f64>,
    //pub end_time: Option<String>,
    //pub episode: Option<String>,
    //pub episode_id: Option<String>,
    //pub episode_number: Option<i32>,
    pub ext: Option<String>,
    //pub extractor: Option<String>,
    //pub extractor_key: Option<String>,
    //#[nserde(rename = "_filename")]
    //pub filename: Option<String>,
    //pub filesize: Option<i64>,
    //pub filesize_approx: Option<String>,
    //pub format: Option<String>,
    //pub format_id: Option<String>,
    //pub format_note: Option<String>,
    //pub formats: Option<Vec<Format>>,
    //pub fps: Option<f64>,
    //pub fragment_base_url: Option<String>,
    //pub fragments: Option<Vec<Fragment>>,
    //pub genre: Option<String>,
    //pub height: Option<i64>,
    //pub http_headers: Option<BTreeMap<String, Option<String>>>,
    pub id: String,
    //pub is_live: Option<bool>,
    pub ie_key: Option<String>,
    //pub language: Option<String>,
    //pub language_preference: Option<i64>,
    //pub license: Option<String>,
    //pub like_count: Option<i64>,
    //pub location: Option<String>,
    //pub manifest_url: Option<String>,
    //pub no_resume: Option<bool>,
    //pub player_url: Option<String>,
    //pub playlist: Option<String>,
    //pub playlist_id: Option<String>,
    //pub playlist_index: Option<Value>,
    pub playlist_title: Option<String>,
    //pub playlist_uploader: Option<String>,
    //pub playlist_uploader_id: Option<String>,
    //pub preference: Option<Value>,
    //pub protocol: Option<Protocol>,
    //pub quality: Option<i64>,
    //pub release_date: Option<String>,
    //pub release_year: Option<i64>,
    //pub repost_count: Option<i64>,
    //pub requested_subtitles: Option<BTreeMap<String, Subtitle>>,
    //pub resolution: Option<String>,
    //pub season: Option<String>,
    //pub season_id: Option<String>,
    //pub season_number: Option<i32>,
    //pub series: Option<String>,
    //pub source_preference: Option<i64>,
    //pub start_time: Option<String>,
    //pub stretched_ratio: Option<f64>,
    //pub subtitles: Option<BTreeMap<String, Option<Vec<Subtitle>>>>,
    //pub tags: Option<Vec<Option<String>>>,
    //pub tbr: Option<f64>,
    pub thumbnail: Option<String>,
    //pub thumbnails: Option<Vec<Thumbnail>>,
    pub thumbnail_filename: Option<String>,
    //pub timestamp: Option<i64>,
    pub title: String,
    pub track: Option<String>,
    //pub track_id: Option<String>,
    //pub track_number: Option<String>,
    //pub upload_date: Option<String>,
    //pub uploader: Option<String>,
    //pub uploader_id: Option<String>,
    //pub uploader_url: Option<String>,
    pub url: Option<String>,
    //pub vbr: Option<f64>,
    //pub vcodec: Option<String>,
    //pub view_count: Option<i64>,
    pub webpage_url: Option<String>,
    //pub width: Option<i64>,
}

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Subtitle {
    pub data: Option<String>,
    pub ext: Option<String>,
    pub url: Option<String>,
}

#[derive(Clone, SerJson, DeJson, Debug, Default)]
pub struct Thumbnail {
    pub filesize: Option<i64>,
    pub height: Option<i64>,
    pub id: Option<String>,
    pub preference: Option<i64>,
    pub url: Option<String>,
    pub width: Option<i64>,
}

/*
#[derive(Clone, Copy, SerJson, DeJson, Debug)]
pub enum Protocol {
    #[nserde(rename = "http")]
    Http,
    #[nserde(rename = "https")]
    Https,
    #[nserde(rename = "rtsp")]
    Rtsp,
    #[nserde(rename = "rtmp")]
    Rtmp,
    #[nserde(rename = "rtmpe")]
    Rtmpe,
    #[nserde(rename = "mms")]
    Mms,
    #[nserde(rename = "f4m")]
    F4M,
    #[nserde(rename = "ism")]
    Ism,
    #[nserde(rename = "m3u8")]
    M3U8,
    #[nserde(rename = "m3u8_native")]
    M3U8Native,
    #[nserde(rename = "http_dash_segments")]
    HttpDashSegments,
} */

use std::io::{copy, Read};
use std::process::{Command, Stdio};
use std::str::Chars;

#[derive(DeJson)]
pub struct JustType {
    _type: Option<String>,
}

pub async fn ytdl_run_with_args(args: Vec<&str>) -> Result<YoutubeDlOutput> {
    let args: Vec<_> = args.into_iter().map(ToString::to_string).collect();

    log::info!("running yt dl with args: {}", args.join(" "));

    tokio::task::spawn_blocking(move || {
        let mut child = Command::new("youtube-dl")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .args(args)
            .spawn()
            .context("error starting youtube-dl, did you install it?")?;
        // Continually read from stdout so that it does not fill up with large output and hang forever.
        // We don't need to do this for stderr since only stdout has potentially giant JSON.
        let mut stdout = Vec::new();
        let child_stdout = child.stdout.take();
        copy(&mut child_stdout.unwrap(), &mut stdout).context("error reading youtube-dl output")?;

        let exit_code = child.wait().context("error while waiting for youtube-dl")?;

        if exit_code.success() {
            let out = String::from_utf8_lossy(stdout.as_slice());
            let out = out.trim();
            let justtype: JustType = nanoserde::DeJson::deserialize_json(out)
                .context("error decoding youtubedl json")?;

            let is_playlist = justtype._type.as_deref() == Some("playlist");
            if is_playlist {
                let playlist: Box<Playlist> = Box::new(
                    nanoserde::DeJson::deserialize_json(out).context("error decoding playlist")?,
                );
                Ok(YoutubeDlOutput::Playlist(playlist))
            } else {
                let video: Box<SingleVideo> = Box::new(
                    nanoserde::DeJson::deserialize_json(out)
                        .context("error decoding singlevideo")?,
                );
                Ok(YoutubeDlOutput::SingleVideo(video))
            }
        } else {
            let mut stderr = vec![];
            if let Some(mut reader) = child.stderr {
                reader.read_to_end(&mut stderr)?;
            }
            let stderr = String::from_utf8(stderr).unwrap_or_default();
            Err(anyhow!(
                "error using youtubedl: {} {}",
                exit_code.code().unwrap_or(1),
                stderr,
            ))
        }
    })
    .await?
}
