#!/usr/bin/env bash

echo "Building web client"
npm --prefix musidex-web run build
rm -r web
cp -r musidex-web/build web

(cd musidex-daemon && cargo build --release)
cp musidex-daemon/target/release/musidex-daemon mdx-daemon
chmod +x ./mdx-daemon
./mdx-daemon
