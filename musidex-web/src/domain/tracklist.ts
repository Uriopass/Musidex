import {MusidexMetadata} from "./api";
import {Setter} from "../components/utils";
import {Dispatch, useCallback} from "react";
import {TrackPlayerAction} from "./trackplayer";

interface Tracklist {
    last_played: number[],
    last_played_maxsize: number,
}

export function emptyTracklist(): Tracklist {
    return {
        last_played: [],
        last_played_maxsize: 0,
    }
}

export type NextTrackCallback = () => void;
export type PrevTrackCallback = () => void;

export function useNextTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, current?: number): NextTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        if (current !== undefined) {
            if(list.last_played.length > list.last_played_maxsize) {
                list.last_played = list.last_played.slice(1);
            }
            list.last_played.push(current);
        }

        let maxscore = undefined;
        let maxmusic = undefined;

        for (let music of metadata.musics) {
            let score = list.last_played.length - list.last_played.indexOf(music) + Math.random();

            if (maxscore === undefined || score > maxscore) {
                maxscore = score;
                maxmusic = music;
            }
        }

        setList(list);
        if (maxmusic !== undefined) {
            let tags = metadata.music_tags_idx.get(maxmusic) || new Map();
            dispatch({action: "play", track: {id: maxmusic, tags: tags}})
        }
    }, [curlist, setList, metadata, current, dispatch])
}

export function usePrevTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata): PrevTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        const prev_music = list.last_played.pop();

        if (prev_music !== undefined) {
            setList(list);
            let tags = metadata.music_tags_idx.get(prev_music) || new Map();
            dispatch({action: "play", track: {id: prev_music, tags: tags}})
        }
    }, [curlist, setList, metadata, dispatch])
}

export function useCanPrev(curlist: Tracklist): () => boolean {
    return useCallback(() => {
        return curlist.last_played.length === 0;
    }, [curlist])
}

export default Tracklist;