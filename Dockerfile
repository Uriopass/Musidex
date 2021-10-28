FROM alpine:3.14

RUN apk add --no-cache cargo python3 ffmpeg npm sqlite-libs sqlite
RUN python3 -m ensurepip

RUN python3 -m pip install youtube_dl

RUN cd musidex-daemon && cargo build --release
RUN cd musidex-web && npm run build

RUN cp -r musidex-web/build web

RUN cp musidex-daemon/target/release/musidex-daemon mdx-daemon
RUN chmod 0755 ./mdx-daemon

EXPOSE 80

CMD mdx-daemon