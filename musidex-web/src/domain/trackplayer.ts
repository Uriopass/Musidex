import React from "react";
import API from "./api";
import {NextTrackCallback, PrevTrackCallback} from "./tracklist";
import {MusidexMetadata, Tag} from "./entity";

export type Track = {
    id: number;
    tags: Map<string, Tag>;
}

export function buildTrack(id: number, metadata: MusidexMetadata): Track | undefined {
    let tags = metadata.music_tags_idx.get(id);
    if (tags === undefined) return;
    return {
        id: id,
        tags: tags,
    }
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

export function setupListeners(trackplayer: TrackPlayer, doNext: NextTrackCallback, doPrev: PrevTrackCallback, dispatch: React.Dispatch<TrackPlayerAction>, metadata: MusidexMetadata) {
    trackplayer.audio.onloadeddata = () => dispatch({action: "audioTick"});
    trackplayer.audio.onplaying = () => dispatch({action: "audioTick"});
    trackplayer.audio.onpause = () => dispatch({action: "audioTick"});
    trackplayer.audio.onended = () => doNext();
    trackplayer.audio.oncanplay = () => {
        trackplayer.loading = false;
        if (!trackplayer.paused) {
            trackplayer.audio.play().catch((e) => console.log(e));
        }
    }

    if ('mediaSession' in navigator) {
        let curtags = trackplayer.current?.tags;
        let artwork = [];
        let thumb = curtags?.get("thumbnail")?.text;
        if (thumb) {
            artwork.push({ src: "storage/"+thumb,   type: 'image/jpeg' });
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: curtags?.get("title")?.text || "No Title",
            artist: curtags?.get("artist")?.text || "No Artist",
            artwork: artwork,
        });

        navigator.mediaSession.setActionHandler('play', () => doNext(trackplayer.current?.id));
        navigator.mediaSession.setActionHandler('pause', () => doNext(trackplayer.current?.id));
        navigator.mediaSession.setActionHandler('seekto', (e) => {
            if (e.seekTime) {
                dispatch(({action: "setTime", time: e.seekTime}))
            }
        });
        navigator.mediaSession.setActionHandler('previoustrack', doPrev);
        navigator.mediaSession.setActionHandler('nexttrack', () => doNext());
    }

    document.body.onkeydown = (e) => {
        if (e.target !== document.body) {
            return;
        }
        if (e.code === "Space" || e.code === "KeyK") {
            e.preventDefault();
            if (!trackplayer.current) {
                doNext();
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
            navigator.mediaSession.setPositionState({
                duration: trackplayer.duration,
                position: trackplayer.audio.currentTime,
            });
            return {
                ...trackplayer,
            }
    }
    return trackplayer
}

export const TrackplayerCtx = React.createContext<[TrackPlayer, React.Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);
export default TrackPlayer;