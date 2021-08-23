#!/usr/bin/env bash

if [[ $1 != "skip-web" ]];
then
    echo "Building web client"
    (cd musidex-web && npm run build)
    rm -r web
    cp -r musidex-web/build web
fi

(cd musidex-daemon && cargo build)
cp musidex-daemon/target/debug/musidex-daemon mdx-daemon
chmod +x ./mdx-daemon
./mdx-daemon
