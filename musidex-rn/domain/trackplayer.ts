import {Dispatch, useEffect} from "react";
import {NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {State, STATE_PAUSED, STATE_PLAYING, STATE_READY, Track} from "react-native-track-player";
import API from "../common/api";
import RNFetchBlob from "rn-fetch-blob";
import {getMusicPath, getThumbnailPath} from "./sync";

type Trackplayer = {
    current: number | undefined,
    duration: number | undefined,
    paused: boolean,
    loading: boolean,
};

export function newTrackPlayer(): Trackplayer {
    return {
        current: undefined,
        duration: undefined,
        paused: true,
        loading: false,
    };
}

export function useSetupListeners(trackplayer: Trackplayer, dispatch: Dispatch<TrackPlayerAction>, doNext: NextTrackCallback, doPrev: PrevTrackCallback) {
    useEffect(() => {
        const v = TrackPlayer.addEventListener("playback-state", (data) => {
            let state: State = data.state;
            let loaded = state === STATE_PAUSED || state === STATE_PLAYING || state === STATE_READY;
            if (trackplayer.loading !== loaded) {
                trackplayer.loading = loaded;
                dispatch({action: "audioTick"});
            }
            if (!loaded) {
                return;
            }
        });

        return () => v.remove();
    }, [trackplayer, dispatch]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener("playback-queue-ended", (_) => {
            console.log("playback ended");
            doNext();
        });
        return () => v.remove();
    }, [doNext]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener("remote-next", (_) => {
            console.log("remote next");
            doNext();
        });
        return () => v.remove();
    }, [doNext]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener("remote-previous", (_) => {
            console.log("remote previous");
            doPrev();
        });
        return () => v.remove();
    }, [doPrev]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener("playback-error", (data) => {
            console.log(data);
        });
        return () => v.remove();
    }, []);
}

export function applyTrackPlayer(trackplayer: Trackplayer, action: TrackPlayerAction): Trackplayer {
    switch (action.action) {
        case "play":
            if (action.id < 0) {
                return trackplayer;
            }
            if (trackplayer.current === action.id) {
                if (trackplayer.paused) {
                    console.log("playing");
                    TrackPlayer.play();
                } else {
                    console.log("pausing");
                    TrackPlayer.pause();
                }
                return {
                    ...trackplayer,
                    loading: trackplayer.paused,
                    paused: !trackplayer.paused,
                };
            }

            const duration = action.tags?.get("duration")?.integer;
            const title = action.tags?.get("title")?.text;
            const artist = action.tags?.get("artist")?.text;
            const thumbnail = action.tags?.get("compressed_thumbnail")?.text || (action.tags?.get("thumbnail")?.text || "");

            const changeSong = async () => {
                const fn = getMusicPath(action.tags);
                let url = API.getStreamSrc(action.id);
                if (fn && await RNFetchBlob.fs.exists(fn)) {
                    url = "file://" + fn;
                }

                const track: Track = {
                    id: url,
                    url: url,
                    artist: artist || "Unknown Artist",
                    title: title || "Unknown Title",
                    duration: duration,
                };
                if (thumbnail) {
                    track.artwork = API.getAPIUrl() + "/storage/" + thumbnail;
                    const p = getThumbnailPath(thumbnail);
                    if (await RNFetchBlob.fs.exists(p)) {
                        track.artwork = "file://" + p;
                    }
                }
                const q = await TrackPlayer.getQueue();
                await TrackPlayer.add(track);
                if (q.length > 0) {
                    await TrackPlayer.skipToNext();
                }
                if (action.seekAt !== undefined) {
                    await TrackPlayer.seekTo(action.seekAt);
                }
                await TrackPlayer.play();
                console.log("changed song ok");
            };
            changeSong();

            return {
                ...trackplayer,
                current: action.id,
                duration: duration || 0,
                loading: true,
                paused: false,
            };
        case "reset":
            TrackPlayer.reset();
            return newTrackPlayer();
        case "setTime":
            TrackPlayer.seekTo(action.time);
            return {
                ...trackplayer,
            };
        case "audioTick":
            return {
                ...trackplayer,
            };
    }
    return trackplayer;
}

export default Trackplayer;
