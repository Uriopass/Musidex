<img alt="Musidex logo, a capital letter M" height="128" src="musidex-web/public/musidex_logo.png" width="128"/>

# Musidex
Your musical pokedex, Plex for music

# Setting up the server

### Linux

Only GNU/Linux distros are supported at the moment.
Since the project is young, you'll have to build it yourself.
We will provide prebuilt binaries eventually.

### Dependencies

[Youtube-dl](http://ytdl-org.github.io/youtube-dl/download.html) to add music from youtube URLs.

```bash
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
```

Ffmpeg so that the downloaded audio files are converted to more friendly formats. (as advised by youtube-dl).  
Npm for the frontend.  
Sqlite for the db.
```bash
sudo apt install ffmpeg nodejs libsqlite3-dev
```

You will also need the [rust compiler](https://www.rust-lang.org/tools/install) for the backend.

```bash
# Installs rust, just follow the instructions
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Building and running

```bash
# First clone the project
git clone https://github.com/Uriopass/Musidex
cd Musidex

# Then start the daemon
cd musidex-daemon
cargo run --release

# Then in a separate terminal start the web server
cd musidex-web
npm start
```

Tada !
