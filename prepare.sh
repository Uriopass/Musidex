#!/usr/bin/env bash
sudo apt install ffmpeg npm libsqlite3-dev python3 python-is-python3

python3 -m pip install -U yt-dlp

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME"/.cargo/env

(cd musidex-web && npm install)
