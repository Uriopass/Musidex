<img alt="Musidex logo, a capital letter M" height="128" src="musidex-web/public/musidex_logo.png" width="128"/>

# Musidex
Your musical pokedex, Plex for music

# Setting up the server

### Linux

Only GNU/Linux distros are supported at the moment.
Since the project is young, you'll have to build it yourself.
We will provide prebuilt binaries eventually.

### Dependencies

You will need [youtube-dl](http://ytdl-org.github.io/youtube-dl/download.html) to add music from youtube URLs.

```bash
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
```

You will also need ffmpeg so that the downloaded audio files are converted to more friendly formats. (as advised by youtube-dl).

```bash
sudo apt install ffmpeg
```

You will also need the [rust compiler](https://www.rust-lang.org/tools/install) for the backend.

```bash
# Installs rust, just follow the instructions
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

And npm for the frontend

```bash
sudo apt install nodejs
```

And docker to start the database

```bash
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt update
sudo apt install docker-ce docker-compose
```

Note that you can also run the database yourself, use the serve_local.sh script and pass the correct identifiers in it.

### Building and running

```bash
# First clone the project
git clone https://github.com/Uriopass/Musidex
cd Musidex

# Then start the daemon
cd musidex-daemon
docker-compose up -d musidex-db
cargo run --release

# Then in a separate terminal start the web server
cd musidex-web
npm start
```

Tada !
