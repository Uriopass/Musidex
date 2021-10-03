import React from "react";
import API from "../common/api";
import {NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import {MusidexMetadata} from "../common/entity";
import {Dispatch} from "../common/utils";

type TrackPlayer = {
    current: number | undefined;
    duration: number;
    paused: boolean;
    loading: boolean;
    audio: HTMLAudioElement;
}


export function newTrackPlayer(): TrackPlayer {
    return {
        current: undefined,
        audio: new Audio(),
        duration: 0,
        paused: true,
        loading: false,
    }
}

export function setupListeners(trackplayer: TrackPlayer, metadata: MusidexMetadata, doNext: NextTrackCallback, doPrev: PrevTrackCallback, dispatch: Dispatch<TrackPlayerAction>) {
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
        let curtags = metadata.getTags(trackplayer.current);
        let artwork = [];
        let thumb = curtags?.get("thumbnail")?.text;
        if (thumb) {
            artwork.push({ src: "storage/"+thumb,   type: 'image/jpeg' });
        }
        let title = curtags?.get("title")?.text || "No Title";
        trackplayer.audio.title = title;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: curtags?.get("artist")?.text || "No Artist",
            artwork: artwork,
        });

        navigator.mediaSession.setActionHandler('play', () => doNext(trackplayer.current));
        navigator.mediaSession.setActionHandler('pause', () => doNext(trackplayer.current));
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
            dispatch({action: "play", id: trackplayer.current});
        }
        if (e.code === "ArrowRight") {
            e.preventDefault();
            if (trackplayer.audio.currentTime + 5 >= trackplayer.duration) {
                doNext();
                return;
            }
            dispatch({action: "setTime", time: trackplayer.audio.currentTime + 5});
        }
        if (e.code === "ArrowLeft") {
            e.preventDefault();
            if (trackplayer.audio.currentTime - 5 <= 0) {
                doPrev();
                return;
            }
            dispatch({action: "setTime", time: trackplayer.audio.currentTime - 5});
        }
    };
}

export function applyTrackPlayer(trackplayer: TrackPlayer, action: TrackPlayerAction): TrackPlayer {
    switch (action.action) {
        case "play":
            if (action.id < 0) return trackplayer;
            if (trackplayer.current === action.id) {
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
            trackplayer.audio.src = API.getStreamSrc(action.id);
            trackplayer.audio.load();
            const duration = action.tags?.get("duration")?.integer;
            return {
                ...trackplayer,
                current: action.id,
                duration: duration || 0,
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
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setPositionState({
                    duration: trackplayer.duration,
                    position: trackplayer.audio.currentTime,
                });
            }
            return {
                ...trackplayer,
            }
    }
    return trackplayer
}

export const TrackplayerCtx = React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);
export default TrackPlayer;