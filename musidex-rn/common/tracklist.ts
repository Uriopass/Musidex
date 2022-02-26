import {getTags, MusidexMetadata, Tags} from "./entity";
import {MusicSelect, SearchForm} from "./filters";
import {Dispatch} from "./utils";
import {useCallback, useRef} from "react";

export type TrackPlayerAction =
    { action: "play", id: number, tags?: Tags }
    | { action: "audioTick" }
    | { action: "setTime", time: number }
    | { action: "loop", shouldLoop: boolean }
    | { action: "reset" }

type Tracklist = {
    last_played: number[];
    last_played_maxsize: number;
    last_manual_select: number | undefined;
}

export function emptyTracklist(): Tracklist {
    return {
        last_played: [],
        last_played_maxsize: 30,
        last_manual_select: undefined,
    };
}

export type NextTrackCallback = (id?: number) => void;
export type PrevTrackCallback = () => void;

export function useNextTrackCallback(curlist: Tracklist, setList: (newv: Tracklist) => void, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, sform: SearchForm, selectedMusics: MusicSelect): NextTrackCallback {
    let f = useRef<NextTrackCallback | null>(null);
    f.current = (id) => {
        let list = {
            ...curlist,
            last_manual_select: id || curlist.last_manual_select,
        };

        if (id === undefined) {
            let best_id = selectedMusics.list[0];
            const curp = list.last_played[list.last_played.length - 1];
            if (curp) {
                const v = selectedMusics.list.indexOf(curp);
                if (v !== -1) {
                    best_id = selectedMusics.list[(v + 1) % selectedMusics.list.length];
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
            setList(list);
        }

        dispatch({action: "play", id: id, tags: getTags(metadata, id)});
    };
    return useCallback((id) => f.current?.(id), [f]);
}

export function useResetCallback(setList: (newv: Tracklist) => void): NextTrackCallback {
    return useCallback(() => {
        setList(emptyTracklist());
    }, [setList]);
}

export function usePrevTrackCallback(curlist: Tracklist, setList: (newv: Tracklist) => void, dispatch: (action: TrackPlayerAction) => void, metadata: MusidexMetadata): PrevTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        list.last_played.pop();
        setList(list);
        let last = list.last_played[list.last_played.length - 1];
        if (last === undefined) {
            return;
        }
        dispatch({action: "play", id: last, tags: getTags(metadata, last)});
    }, [curlist, setList, metadata, dispatch]);
}

export default Tracklist;
