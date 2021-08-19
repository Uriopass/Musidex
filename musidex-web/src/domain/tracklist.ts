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

export function emptyTracklist(): Tracklist {
    return {
        current: null,
        audio: new Audio(),
        duration: 0,
        paused: true,
        loading: false
    }
}

export function applyTracklist(tracklist: Tracklist, action: TrackAction): Tracklist {
    switch (action.action) {
        case "play":
            if (action.track.id < 0) return tracklist;
            if (tracklist.current && (tracklist.current.id === action.track.id)) {
                if (tracklist.paused) {
                    tracklist.audio.play();
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
            tracklist.audio.play();
            return {
                ...tracklist,
                current: action.track,
                duration: action.track.duration || 0,
                loading: true,
            }
        case "audioTick":
            if (tracklist.current === null) return tracklist;
            return {
                ...tracklist,
                duration: tracklist.audio.duration,
                paused: tracklist.audio.paused,
                loading: tracklist.loading && tracklist.audio.paused,
            }
    }
    return tracklist
}

export const TracklistCtx = React.createContext<[Tracklist, React.Dispatch<TrackAction>]>([emptyTracklist(), _ => _]);
export default Tracklist;