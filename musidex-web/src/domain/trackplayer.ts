import React from "react";
import API, {Tag} from "./api";
import {DecideNextCallback} from "./tracklist";

export type Track = {
    id: number;
    tags: Map<string, Tag>;
}

type TrackPlayer = {
    current: Track | undefined;
    duration: number;
    paused: boolean;
    loading: boolean;
    audio: HTMLAudioElement;
}

export type TrackPlayerAction =
    { action: "play", track: Track }
    | { action: "audioTick" }
    | { action: "setTime", time: number }

export function newTrackPlayer(): TrackPlayer {
    return {
        current: undefined,
        audio: new Audio(),
        duration: 0,
        paused: true,
        loading: false,
    }
}

export function setupListeners(trackplayer: TrackPlayer, onNext: DecideNextCallback, dispatch: React.Dispatch<TrackPlayerAction>) {
    trackplayer.audio.onloadeddata = () => dispatch({action: "audioTick"});
    trackplayer.audio.onplaying = () => dispatch({action: "audioTick"});
    trackplayer.audio.onpause = () => dispatch({action: "audioTick"});
    trackplayer.audio.onended = onNext;
    trackplayer.audio.oncanplay = () => {
        trackplayer.loading = false;
        if (!trackplayer.paused) {
            trackplayer.audio.play().catch((e) => console.log(e));
        }
    }
    document.body.onkeydown = (e) => {
        if (e.code === "Space" || e.code === "KeyK") {
            e.preventDefault();
            if (!trackplayer.current) {
                onNext();
                return;
            }
            dispatch({action: "play", track: trackplayer.current});
        }
    };
}

export function applyTrackPlayer(trackplayer: TrackPlayer, action: TrackPlayerAction): TrackPlayer {
    switch (action.action) {
        case "play":
            if (action.track.id < 0) return trackplayer;
            if (trackplayer.current?.id === action.track.id) {
                if (trackplayer.paused) {
                    trackplayer.audio.play().catch((e) => console.log(e));
                } else {
                    trackplayer.audio.pause();
                }
                return {
                    ...trackplayer,
                    loading: trackplayer.paused,
                    paused: !trackplayer.paused,
                }
            }
            trackplayer.audio.src = API.getStreamSrc(action.track.id);
            trackplayer.audio.load();
            return {
                ...trackplayer,
                current: action.track,
                duration: action.track.tags.get("duration")?.integer || 0,
                loading: true,
                paused: false,
            }
        case "setTime":
            trackplayer.audio.currentTime = action.time;
            return {
                ...trackplayer
            }
        case "audioTick":
            if (trackplayer.current === undefined) return trackplayer;
            if (trackplayer.audio.ended) {
                trackplayer.paused = true;
            }
            if (!trackplayer.audio.paused) {
                trackplayer.loading = false;
            }
            if (trackplayer.audio.duration) {
                trackplayer.duration = trackplayer.audio.duration;
            }
            return {
                ...trackplayer,
            }
    }
    return trackplayer
}

export const TrackplayerCtx = React.createContext<[TrackPlayer, React.Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);
export default TrackPlayer;