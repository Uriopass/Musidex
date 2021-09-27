import {Audio} from "expo-av";
import {Dispatch} from "react";
import {NextTrackCallback, TrackPlayerAction} from "../common/tracklist";
import API from "../common/api";

type Trackplayer = {
    current: number | undefined,
    duration: number | undefined,
    paused: boolean,
    loading: boolean,
    audio: Audio.Sound,
};

const playbackObject = new Audio.Sound();
export function newTrackPlayer(): Trackplayer {
    return {
        current: undefined,
        duration: undefined,
        paused: true,
        loading: false,
        audio: playbackObject,
    }
}

export function setupListeners(trackplayer: Trackplayer, dispatch: Dispatch<TrackPlayerAction>, doNext: NextTrackCallback) {
    trackplayer.audio.setOnPlaybackStatusUpdate((status) => {
        if (trackplayer.loading !== status.isLoaded) {
            trackplayer.loading = status.isLoaded;
            dispatch({action: "audioTick"});
        }
        if (!status.isLoaded) {
            if (status.error) {
                console.log(`Encountered a fatal error during playback: ${status.error}`);
            }
            return;
        }
        if (status.isPlaying && trackplayer.paused && trackplayer.audio._loaded) {
            trackplayer.audio.pauseAsync();
        }
        if (!status.isPlaying && !trackplayer.paused  && trackplayer.audio._loaded) {
            trackplayer.audio.playAsync();
        }

        if (status.durationMillis !== undefined && trackplayer.duration !== status.durationMillis / 1000) {
            trackplayer.duration = status.durationMillis / 1000;
            dispatch({action: "audioTick"});
        }

        if (status.didJustFinish && !status.isLooping) {
            doNext();
        }
    })
}

export function applyTrackPlayer(trackplayer: Trackplayer, action: TrackPlayerAction): Trackplayer {
    switch (action.action) {
        case "play":
            if (action.id < 0) return trackplayer;
            if (trackplayer.current === action.id) {
                return {
                    ...trackplayer,
                    loading: trackplayer.paused,
                    paused: !trackplayer.paused,
                }
            }
            let load = () => trackplayer.audio.loadAsync({uri: API.getStreamSrc(action.id)});
            if (trackplayer.audio._loaded) {
                trackplayer.audio.unloadAsync().then(load);
            } else {
                load();
            }

            return {
                ...trackplayer,
                current: action.id,
                duration: action.duration || 0,
                loading: true,
                paused: false,
            }
        case "setTime":
            const _ = trackplayer.audio.setPositionAsync(action.time * 1000);
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