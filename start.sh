#!/usr/bin/env bash

echo "Building web client"
(cd musidex-web && npm run build)
rm -r web >/dev/null 2> /dev/null
cp -r musidex-web/build web

(cd musidex-daemon && cargo build --release)
cp musidex-daemon/target/release/musidex-daemon mdx-daemon
chmod +x ./mdx-daemon
./mdx-daemon
