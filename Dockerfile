FROM rust:1.52-slim as daemon_build
WORKDIR /

ADD musidex-daemon ./musidex-daemon

RUN cd musidex-daemon && ls
RUN cd musidex-daemon && cargo build --release --features bundled

RUN cp musidex-daemon/target/release/musidex-daemon mdx-daemon
RUN chmod 0755 ./mdx-daemon

FROM alpine:3.14 as web_build
WORKDIR /
RUN apk add npm

ADD musidex-web ./musidex-web
ADD musidex-ts-common ./musidex-ts-common

RUN cd musidex-web && npm i && npm run build
RUN cp -r musidex-web/build web

FROM debian:bullseye-20211011-slim

RUN apt-get update
RUN apt-get install -y python3 ffmpeg
RUN apt-get install -y python3-pip
RUN apt-get clean
RUN python3 -m pip install -U yt-dlp

ADD musidex-neuralembed ./musidex-neuralembed

RUN python3 --version

RUN cd musidex-neuralembed && python3 -m pip install --no-cache-dir -r requirements.txt

COPY --from=daemon_build /mdx-daemon .
COPY --from=web_build /web ./web

EXPOSE 80

CMD until ./mdx-daemon; do echo "Try again"; done
