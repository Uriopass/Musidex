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

export type DecideNextCallback = () => void;

export function useDecideNextCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, current?: number): DecideNextCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        if (current !== undefined) {
            list.last_played = list.last_played.slice(1);
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
        if(maxmusic !== undefined) {
            let tags = metadata.music_tags_idx.get(maxmusic) || new Map();
            dispatch({action: "play", track: {id: maxmusic, tags: tags}})
        }
    }, [curlist, setList, metadata, current, dispatch])
}

export default Tracklist;