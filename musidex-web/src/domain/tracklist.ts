import {Setter} from "../components/utils";
import React, {Dispatch, useCallback} from "react";
import {buildTrack, TrackPlayerAction} from "./trackplayer";
import {canPlay, dot, MusidexMetadata, Vector} from "./entity";

interface Tracklist {
    last_played: number[];
    last_played_maxsize: number;
    best_tracks: number[];
    score_map: Map<number, number>;
}

export function emptyTracklist(): Tracklist {
    return {
        last_played: [],
        last_played_maxsize: 30,
        best_tracks: [],
        score_map: new Map(),
    }
}

export type NextTrackCallback = (id?: number) => void;
export type PrevTrackCallback = () => void;

export function useNextTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata): NextTrackCallback {
    return useCallback((id) => {
        let list = {
            ...curlist,
        };

        if (id === undefined) {
            let best_id = list.best_tracks[0];
            let score = list.score_map.get(best_id || -1);
            if (score !== undefined) {
                id = best_id;
            }
        }
        if (id === undefined) {
            return;
        }
        const track = buildTrack(id, metadata);
        if (track === undefined) {
            return;
        }

        if (id !== list.last_played[list.last_played.length - 1]) {
            list.last_played.push(id);
            if (list.last_played.length > list.last_played_maxsize) {
                list.last_played = list.last_played.slice(1);
            }
            list = updateCache(list, metadata);
            setList(list);
        }

        dispatch({action: "play", track: track})
    }, [curlist, setList, metadata, dispatch])
}

export function updateCache(list: Tracklist, metadata: MusidexMetadata): Tracklist {
    let i = list.last_played.length;
    while (i--) {
        // @ts-ignore
        if (!metadata.music_tags_idx.has(list.last_played[i])) {
            list.last_played.splice(i, 1);
        }
    }

    const lastplayedvec = getLastvec(list, metadata);
    list.score_map = new Map();

    for (let music of metadata.musics) {
        let score = getScore(list, lastplayedvec, music, metadata);
        if (score === undefined) {
            continue;
        }
        list.score_map.set(music, score);
    }

    list.best_tracks = metadata.musics.slice();
    list.best_tracks.sort((a, b) => {
        return (list.score_map.get(b) || -100000) - (list.score_map.get(a) || -100000);
    });

    return list;
}

export function getLastvec(list: Tracklist, metadata: MusidexMetadata): Vector | undefined {
    return metadata.embeddings.get(list.last_played[list.last_played.length - 1] || -1)
}

export function getScore(list: Tracklist, lastvec: Vector | undefined, id: number, metadata: MusidexMetadata): number | undefined {
    let tags = metadata.music_tags_idx.get(id);
    if (tags === undefined || !canPlay(tags)) {
        return undefined;
    }
    let score = Math.random() * 0.0001;
    let idx = list.last_played.lastIndexOf(id);
    if (idx >= 0) {
        let d = list.last_played.length - idx;
        score -= 1 / d;
    }
    let emb = metadata.embeddings.get(id);
    if (emb !== undefined && lastvec !== undefined) {
        score += dot(lastvec, emb) / (lastvec.mag * emb.mag);
    }
    return score;
}

export function usePrevTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata): PrevTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        list.last_played.pop();
        updateCache(list, metadata);
        setList(list);
        let last = list.last_played[list.last_played.length - 1];
        if (last === undefined) {
            return;
        }
        let tags = metadata.music_tags_idx.get(last) || new Map();
        dispatch({action: "play", track: {id: last, tags: tags}})
    }, [curlist, setList, metadata, dispatch])
}

export function useCanPrev(curlist: Tracklist): () => boolean {
    return useCallback(() => {
        return curlist.last_played.length > 1;
    }, [curlist])
}

export const TracklistCtx = React.createContext<Tracklist>(emptyTracklist());

export default Tracklist;