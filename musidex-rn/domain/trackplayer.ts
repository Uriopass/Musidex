import {Dispatch, useEffect} from "react";
import {NextTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {Event, State, Track} from "react-native-track-player";
import API from "../common/api";

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
    }
}

export function setupListeners(trackplayer: Trackplayer, dispatch: Dispatch<TrackPlayerAction>, doNext: NextTrackCallback) {
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
        })

        return () => v.remove();
    }, [trackplayer, dispatch])

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (_) => {
            doNext();
        })
        return () => v.remove();
    }, [doNext])

    useEffect(() => {
        const v = TrackPlayer.addEventListener(Event.PlaybackError, (data) => {
            console.log(data);
        })
        return () => v.remove();
    }, [])
}

export function applyTrackPlayer(trackplayer: Trackplayer, action: TrackPlayerAction): Trackplayer {
    switch (action.action) {
        case "play":
            if (action.id < 0) return trackplayer;
            if (trackplayer.current === action.id) {
                if (trackplayer.paused) {
                    TrackPlayer.play();
                } else {
                    TrackPlayer.pause();
                }
                return {
                    ...trackplayer,
                    loading: trackplayer.paused,
                    paused: !trackplayer.paused,
                }
            }

            const duration = action.tags?.get("duration")?.integer;
            const title = action.tags?.get("title")?.text;
            const artist = action.tags?.get("artist")?.text;
            const thumbnail = action.tags?.get("compressed_thumbnail")?.text || (action.tags?.get("thumbnail")?.text || "");

            const track: Track = {
                url: API.getStreamSrc(action.id), // Load media from the network
                duration: duration,
            };
            if (title) {
                track.title = title;
            }
            if (artist) {
                track.artist = artist;
            }
            if (thumbnail) {
                track.artwork = API.getAPIUrl() + "/storage/" + thumbnail;
            }

            const changeSong = async () => {
                await TrackPlayer.reset();
                await TrackPlayer.add(track)
                await TrackPlayer.play();
            };
            changeSong();

            return {
                ...trackplayer,
                current: action.id,
                duration: duration || 0,
                loading: true,
                paused: false,
            }
        case "setTime":
            //const _ = trackplayer.audio.setPositionAsync(action.time * 1000);
            return {
                ...trackplayer
            }
        case "audioTick":
            return {
                ...trackplayer,
            }
    }
    return trackplayer
}

export default Trackplayer;