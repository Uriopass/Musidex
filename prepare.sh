#!/usr/bin/env bash

sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl

sudo apt install ffmpeg npm libsqlite3-dev python3 python-is-python3

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME"/.cargo/env

(cd musidex-web && npm install)