import {canPlay, getTags, MusidexMetadata, Tags, Vector} from "./entity";
import {isSimilarity, SearchForm} from "./filters";
import {Dispatch, dot} from "./utils";
import {useCallback, useRef} from "react";
import {PositionStorage} from "../domain/positionStorage";

export type TrackPlayerAction =
    { action: "play", id: number, tags?: Tags, seekAt?: number }
    | { action: "audioTick" }
    | { action: "setTime", time: number }
    | { action: "reset" }

type Tracklist = {
    last_played: number[];
    last_played_maxsize: number;
    score_map: Map<number, number>;
}

export function emptyTracklist(): Tracklist {
    return {
        last_played: [],
        last_played_maxsize: 30,
        score_map: new Map(),
    };
}

export type NextTrackCallback = (id?: number) => void;
export type PrevTrackCallback = () => void;

let positionSetID = 0;

export function useNextTrackCallback(curlist: Tracklist, setList: (newv: Tracklist) => void, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, sform: SearchForm, selectedMusics: number[], lastPosition: PositionStorage): NextTrackCallback {
    let f = useRef<NextTrackCallback | null>(null);
    f.current = (id) => {
        let list = {
            ...curlist,
        };

        if (id !== undefined) {
            positionSetID += 1;
            const lPositionSetID = positionSetID;
            const lid: number = id;
            getPosition().then((pos) => {
                if (positionSetID === lPositionSetID) {
                    setLastPosition([lid, pos]);
                }
            })
        } else {
            setLastPosition(undefined);
        }

        if (id === undefined) {
            let best_id = selectedMusics[0];
            const curp = list.last_played[list.last_played.length - 1]
            if (curp) {
                const v = selectedMusics.indexOf(curp);
                if (v !== -1) {
                    best_id = selectedMusics[(v + 1) % selectedMusics.length];
                }
            }

            if (isSimilarity(sform)) {
                best_id = selectedMusics[0];
                const score = list.score_map.get(best_id ?? -1);
                if (score === undefined) {
                    return;
                }
            }
            id = best_id;
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

        dispatch({action: "play", id: id, tags: getTags(metadata, id), seekAt: (id === lastPosition?.[0]) ? lastPosition[1] : undefined});
    };
    return useCallback((id) => f.current?.(id), [f]);
}

export function useResetCallback(setList: (newv: Tracklist) => void, metadata: MusidexMetadata): NextTrackCallback {
    return useCallback(() => {
        let l = emptyTracklist();
        l = updateScoreCache(l, metadata);
        setList(l);
    }, [metadata, setList]);
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

    return list;
}

export function getLastvec(list: Tracklist, metadata: MusidexMetadata): Vector | undefined {
    return metadata.embeddings.get(list.last_played[list.last_played.length - 1] ?? -1);
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
