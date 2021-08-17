import React from "react";
import API, {Tag} from "./api";

export type Track = {
    id: number;
    tags: Map<string, Tag>;
    duration?: number;
}

export type PlayingTrack = {
    track: Track;
    curtime: number;
    paused: boolean;
    loading: boolean;
}

type Tracklist = {
    current: PlayingTrack | null;
    audio: HTMLAudioElement;
}

type TrackAction =
    { action: "play", track: Track }
    | { action: "audioTick" }

export function emptyTracklist(): Tracklist {
    return {
        current: null,
        audio: new Audio(),
    }
}

export function applyTracklist(tracklist: Tracklist, action: TrackAction): Tracklist {
    if (action.action !== "audioTick") {
        console.log(action);
    }
    switch (action.action) {
        case "play":
            if (action.track.id < 0) return tracklist;

            if (tracklist.current && (tracklist.current.track.id === action.track.id)) {
                if (tracklist.current.paused) {
                    tracklist.audio.play();
                } else {
                    tracklist.audio.pause();
                }
                return {
                    ...tracklist,
                    current: {...tracklist.current, paused: !tracklist.current.paused}
                }
            }
            tracklist.audio.src = API.getStreamSrc(action.track.id);
            tracklist.audio.play();
            return {
                ...tracklist,
                current: {track: action.track, curtime: 0, paused: false, loading: true}
            }
        case "audioTick":
            if (tracklist.current === null) return tracklist;
            return {
                ...tracklist,
                current: {
                    ...tracklist.current,
                    track: {
                        ...tracklist.current.track,
                        duration: tracklist.audio.duration,
                    },
                    curtime: tracklist.audio.currentTime,
                }
            }
    }
    return tracklist
}

export const TracklistCtx = React.createContext<[Tracklist, React.Dispatch<TrackAction>]>([emptyTracklist(), _ => _]);
export default Tracklist;