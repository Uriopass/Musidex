<img alt="Musidex logo, a capital letter M" height="128" src="musidex-web/public/musidex_logo.png" width="128"/>

# Musidex
Your musical pokedex, Plex for music.

Add songs from youtube videos or youtube playlist to your library,
or import them from your local files.  
Tags are automatically imported and searchable,
sync it on your phone to enjoy free offline music, managed from your home server.

### Features


- [x] Music streaming
- [x] Youtube import
- [x] Web front
- [ ] Text search
- [ ] Tag filtering
- [ ] Playlists through tags/Tag editor
- [ ] Neural embedding based auto play
- [ ] MP3 import
- [ ] Ogg import
- [ ] FLAC import
- [ ] Android App
- [ ] iOS App

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
sudo apt install ffmpeg npm libsqlite3-dev
```

The [rust compiler](https://www.rust-lang.org/tools/install) for the backend.

```bash
# Installs rust, just follow the instructions
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

The repo itself.

```bash
git clone https://github.com/Uriopass/Musidex
cd Musidex

# Prepare the web dependencies
(cd musidex-web && npm install)
```

### Building and running

```bash
# Just run the start script
./start.sh
```

# Developing on the project

First install the dependencies as listed above, then

```bash
# Start the daemon, will listen on localhost:3200
cargo run --manifest-path=musidex-daemon/Cargo.toml

# And in another terminal... start the web client
cd musidex-web
npm start # will start on localhost:3000 
          # and proxy api requests to the daemon
```

Then if you want to work on the daemon,
simply run `cargo run` again after doing your modifications.

If you want to work on the web client,
the modifications will be hot reloaded.

All musidex data ends up in the `storage` directory.
