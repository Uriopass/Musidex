import {Dispatch, RefObject, useEffect} from "react";
import {NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {Event, State, Track} from "react-native-track-player";
import API from "../common/api";
import RNFetchBlob from "rn-fetch-blob";
import {getMusicPath, getThumbnailPath} from "./sync";
import {PositionStorage} from "./positionStorage";

type Trackplayer = {
    current: number | undefined,
    duration: number | undefined,
    paused: boolean,
    loading: boolean,
    lastPosition: RefObject<PositionStorage>,
};

export function newTrackPlayer(lastPosition: RefObject<PositionStorage>): Trackplayer {
    return {
        current: undefined,
        duration: undefined,
        paused: true,
        loading: false,
        lastPosition: lastPosition,
    };
}

export function useSetupListeners(trackplayer: Trackplayer, dispatch: Dispatch<TrackPlayerAction>, doNext: NextTrackCallback, doPrev: PrevTrackCallback) {
    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
            let state: State = data.state;
            let loaded = state === State.Paused || state === State.Playing || state === State.Ready;
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
        const v = TrackPlayer.addEventListener(Event.RemotePlay, () => {
            console.log("remote play", trackplayer.current);
            doNext(trackplayer.current);
        });
        return () => v.remove();
    }, [doNext, trackplayer]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.RemotePause, () => {
            console.log("remote pause", trackplayer.current);
            doNext(trackplayer.current);
        });
        return () => v.remove();
    }, [doNext, trackplayer]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (_) => {
            console.log("playback ended");
            doNext();
        });
        return () => v.remove();
    }, [doNext]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.RemoteNext, () => {
            console.log("remote next");
            doNext();
        });
        return () => v.remove();
    }, [doNext]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.RemotePrevious, () => {
            console.log("remote previous");
            doPrev();
        });
        return () => v.remove();
    }, [doPrev]);

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.PlaybackError, (data) => {
            console.log(data);
        });
        return () => v.remove();
    }, []);
}

export function applyTrackPlayer(trackplayer: Trackplayer, action: TrackPlayerAction): Trackplayer {
    switch (action.action) {
        case "play":
            console.log(action);
            if (action.id < 0) {
                return trackplayer;
            }
            if (trackplayer.current === action.id && !action.force) {
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
            const seekAt = trackplayer.lastPosition.current?.positions[action.id];

            const changeSong = async () => {
                const fn = getMusicPath(action.tags);
                let url = API.getStreamSrc(action.id);
                if (fn && await RNFetchBlob.fs.exists(fn)) {
                    url = "file://" + fn;
                }

                const track: Track = {
                    id: `${action.id}`,
                    url: url,
                    artist: artist || "",
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
                if (seekAt && duration && seekAt < duration - 60) {
                    await TrackPlayer.seekTo(seekAt);
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
            return newTrackPlayer(trackplayer.lastPosition);
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
