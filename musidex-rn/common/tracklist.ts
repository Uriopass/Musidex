import {canPlay, getTags, MusidexMetadata, Tags, Vector} from "./entity";
import Filters, {findFirst} from "../common/filters";
import {Dispatch, dot} from "./utils";
import {useCallback} from "react";

export type TrackPlayerAction =
    { action: "play", id: number, tags?: Tags }
    | { action: "audioTick" }
    | { action: "setTime", time: number }

type Tracklist = {
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
    };
}

export type NextTrackCallback = (id?: number) => void;
export type PrevTrackCallback = () => void;

export function useNextTrackCallback(curlist: Tracklist, setList: (newv: Tracklist) => void, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, filters: Filters, curUser: number | undefined): NextTrackCallback {
    return useCallback((id) => {
        let list = {
            ...curlist,
        };

        if (id === undefined) {
            let best_id = findFirst(filters, list.best_tracks, metadata, curUser);
            let score = list.score_map.get(best_id || -1);
            if (score !== undefined) {
                id = best_id;
            }
        }
        if (id === undefined) {
            return;
        }

        if (id !== list.last_played[list.last_played.length - 1]) {
            list.last_played.push(id);
            if (list.last_played.length > list.last_played_maxsize) {
                list.last_played = list.last_played.slice(1);
            }
            list = updateScoreCache(list, metadata);
            setList(list);
        }

        dispatch({action: "play", id: id, tags: getTags(metadata, id)});
    }, [curlist, setList, metadata, dispatch, filters, curUser]);
}

export function updateScoreCache(list: Tracklist, metadata: MusidexMetadata): Tracklist {
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
        let tags = getTags(metadata, music);
        if (tags === undefined || !canPlay(tags)) {
            continue;
        }
        let score = Math.random() * 0.0001;
        let neural = neuralScore(list, lastplayedvec, music, metadata);
        if (neural !== undefined) {
            score += neural;
        }
        list.score_map.set(music, score);
    }

    list.last_played.forEach((id, l_index) => {
        let prev = list.score_map.get(id);
        if (prev === undefined) {
            return;
        }
        let d = list.last_played.length - l_index;
        list.score_map.set(id, prev - 1 / d);
    });

    list.best_tracks = metadata.musics.slice();
    list.best_tracks.sort((a, b) => {
        return (list.score_map.get(b) || -100000) - (list.score_map.get(a) || -100000);
    });

    return list;
}

export function getLastvec(list: Tracklist, metadata: MusidexMetadata): Vector | undefined {
    return metadata.embeddings.get(list.last_played[list.last_played.length - 1] || -1);
}

export function neuralScore(list: Tracklist, lastvec: Vector | undefined, id: number, metadata: MusidexMetadata): number | undefined {
    let emb = metadata.embeddings.get(id);
    if (emb === undefined || lastvec === undefined) {
        return undefined;
    }
    return dot(lastvec, emb) / (lastvec.mag * emb.mag);
}

export function usePrevTrackCallback(curlist: Tracklist, setList: (newv: Tracklist) => void, dispatch: (action: TrackPlayerAction) => void, metadata: MusidexMetadata): PrevTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        list.last_played.pop();
        updateScoreCache(list, metadata);
        setList(list);
        let last = list.last_played[list.last_played.length - 1];
        if (last === undefined) {
            return;
        }
        dispatch({action: "play", id: last, tags: getTags(metadata, last)});
    }, [curlist, setList, metadata, dispatch]);
}

export default Tracklist;
