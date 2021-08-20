import React from "react";
import API, {Tag} from "./api";

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
}

type TrackAction =
    { action: "play", track: Track }
    | { action: "audioTick" }
    | { action: "setTime", time: number }

export function newTracklist(): Tracklist {
    return {
        current: null,
        audio: new Audio(),
        duration: 0,
        paused: true,
        loading: false,
    }
}

export function setupListeners(tracklist: Tracklist, dispatch: React.Dispatch<TrackAction>) {
    tracklist.audio.onloadeddata = () => dispatch({action: "audioTick"});
    tracklist.audio.onplaying = () => dispatch({action: "audioTick"});
    tracklist.audio.onpause = () => dispatch({action: "audioTick"});
    tracklist.audio.onended = () => dispatch({action: "audioTick"});
    tracklist.audio.oncanplay = () => {
        tracklist.loading = false;
        if(!tracklist.paused) {
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
        case "audioTick":
            if (tracklist.current === null) return tracklist;
            if (tracklist.audio.ended) {
                tracklist.paused = true;
            }
            if (!tracklist.audio.paused) {
                tracklist.loading = false;
            }
            tracklist.duration = tracklist.audio.duration;
            return {
                ...tracklist,
            }
    }
    return tracklist
}

export const TracklistCtx = React.createContext<[Tracklist, React.Dispatch<TrackAction>]>([newTracklist(), _ => _]);
export default Tracklist;