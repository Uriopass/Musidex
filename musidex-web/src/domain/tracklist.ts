import React from "react";
import API, {Tag} from "./api";
import {Setter} from "../components/utils";

export type Track = {
    id: number;
    tags: Map<string, Tag>;
    duration?: number;
}

type Tracklist = {
    current: Track | null;
    duration: number;
    paused: boolean;
    loading: boolean;
    audio: HTMLAudioElement;
    setvolume: Setter<number>;
}

type TrackAction =
    { action: "play", track: Track }
    | { action: "audioTick" }
    | { action: "setTime", time: number }
    | { action: "setVolume", volume: number }

export function newTracklist(setvolume: Setter<number>): Tracklist {
    return {
        current: null,
        audio: new Audio(),
        duration: 0,
        paused: true,
        loading: false,
        setvolume: setvolume,
    }
}

export function setupListeners(tracklist: Tracklist, dispatch: React.Dispatch<TrackAction>) {
    tracklist.audio.onloadeddata = () => dispatch({action: "audioTick"});
    tracklist.audio.onplaying = () => dispatch({action: "audioTick"});
    tracklist.audio.onpause = () => dispatch({action: "audioTick"});
    tracklist.audio.oncanplay = () => {
        tracklist.loading = false;
        if(!tracklist.paused) {
            console.log("playing after oncanplay")
            tracklist.audio.play().catch((e) => console.log(e));
        }
    }
}

export function applyTracklist(tracklist: Tracklist, action: TrackAction): Tracklist {
    switch (action.action) {
        case "play":
            if (action.track.id < 0) return tracklist;
            if (tracklist.current && (tracklist.current.id === action.track.id)) {
                if (tracklist.paused) {
                    tracklist.audio.play().catch((e) => console.log(e));
                } else {
                    tracklist.audio.pause();
                }
                return {
                    ...tracklist,
                    loading: tracklist.paused,
                    paused: !tracklist.paused,
                }
            }
            tracklist.audio.src = API.getStreamSrc(action.track.id);
            tracklist.audio.load();
            return {
                ...tracklist,
                current: action.track,
                duration: action.track.duration || 0,
                loading: true,
                paused: false,
            }
        case "setTime":
            tracklist.audio.currentTime = action.time;
            return {
                ...tracklist
            }
        case "setVolume":
            tracklist.setvolume(action.volume);
            return tracklist;
        case "audioTick":
            if (tracklist.current === null) return tracklist;
            return {
                ...tracklist,
                duration: tracklist.audio.duration,
                loading: tracklist.loading && tracklist.audio.paused,
            }
    }
    return tracklist
}

export const TracklistCtx = React.createContext<[Tracklist, React.Dispatch<TrackAction>]>([newTracklist(_ => _), _ => _]);
export default Tracklist;