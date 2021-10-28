FROM alpine:3.14

ADD musidex-daemon ./musidex-daemon
ADD musidex-neuralembed ./musidex-neuralembed
ADD musidex-web ./musidex-web
ADD musidex-ts-common ./musidex-ts-common

RUN cd musidex-daemon && ls

RUN apk add --no-cache cargo python3 ffmpeg npm sqlite-libs sqlite
RUN python3 -m ensurepip

RUN python3 -m pip install youtube_dl

RUN cd musidex-daemon && cargo build --release --features bundled
RUN cd musidex-web && npm run build

RUN cp -r musidex-web/build web

RUN cp musidex-daemon/target/release/musidex-daemon mdx-daemon
RUN chmod 0755 ./mdx-daemon

RUN rm -rf musidex-daemon
RUN rm -rf musidex-web
RUN rm -rf musidex-ts-common

EXPOSE 80

CMD mdx-daemon