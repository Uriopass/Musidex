import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import API from "./common/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";
import Tracklist, {
    emptyTracklist,
    updateScoreCache,
    useNextTrackCallback,
    usePrevTrackCallback
} from "./common/tracklist";
import {EditableCtx, useCookie, useLocalStorageVersion} from "./components/utils";
import {newSearchForm, SearchForm, useMusicSelect} from "./common/filters";
import {MetadataCtx, useMetadata} from "./domain/metadata";
import {Setter} from "./common/utils";
import {firstUser, MusidexMetadata} from "./common/entity";

export const SearchFormCtx = React.createContext<[SearchForm, Setter<SearchForm>]>([newSearchForm(), _ => _]);
export const SelectedMusicsCtx = React.createContext<number[]>([]);
export const TracklistCtx = React.createContext<Tracklist>(emptyTracklist());

const App = () => {
    API.setAPIUrl(window.location.origin);
    const [metadata, setMetadata] = useMetadata();
    const [userStr, setUserStr] = useCookie("cur_user", undefined);
    const user = parseInt(userStr || "undefined") || undefined;
    const setUser = useCallback((v: number) => setUserStr(v.toString()), [setUserStr]);
    const _sform = useLocalStorageVersion<SearchForm>("searchform", 1, newSearchForm());
    const [sform] = _sform;
    const [syncProblem, setSyncProblem] = useState(false);
    const [volume, setVolume] = useLocalStorage("volume", 1);
    const tp = useReducer(applyTrackPlayer, newTrackPlayer());
    const [trackplayer, dispatchPlayer] = tp;
    const [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);
    const [list, setList] = useState<Tracklist>(emptyTracklist());
    const editableSt = useState(false);
    const selectedMusics = useMusicSelect(metadata, sform, list, user);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, sform, selectedMusics);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const ws = useRef<any>();

    let onMessage = useCallback(async (ev) => {
        let [meta, metaStr] = await API.metadataFromWSMsg(ev, metadata);
        if (trackplayer.current && !meta.music_tags_idx.has(trackplayer.current)) {
            doNext();
        }
        setMetadata(meta, metaStr);
        if (user === undefined || !meta.users.some((u) => u.id === user)) {
            const u = firstUser(meta);
            if (u !== undefined) {
                setUser(u);
            }
        }
        let l = {...list};
        l = updateScoreCache(l, meta);
        setList(l);
    }, [metadata, setMetadata, list, setList, trackplayer, doNext, user, setUser]);

    useEffect(() => {
        if (ws.current === undefined) {
            ws.current = API.metadataWSInit();
            ws.current.binaryType = "arraybuffer"
        }

        ws.current.onmessage = onMessage;
        ws.current.onclose = (_: any) => {
            setSyncProblem(true);
        };
        ws.current.onopen = (_: any) => {
            setSyncProblem(false);
        };
    }, [setSyncProblem, onMessage])

    let fetchMetadata = useCallback(() => {
        ws.current?.send("refresh");
    }, [ws]);

    trackplayer.audio.volume = volume;
    useMemo(() => setupListeners(trackplayer, metadata, doNext, doPrev, dispatchPlayer), [trackplayer, metadata, doNext, doPrev, dispatchPlayer]);

    const metap = useMemo<[MusidexMetadata, () => void]>(() => [metadata, fetchMetadata], [metadata, fetchMetadata]);
    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage}
                    curUser={metadata.users.find((x) => x.id === user)}/>
            <EditableCtx.Provider value={editableSt}>
                <MetadataCtx.Provider value={metap}>
                    <TrackplayerCtx.Provider value={tp}>
                        <TracklistCtx.Provider value={list}>
                            <SearchFormCtx.Provider value={_sform}>
                                <SelectedMusicsCtx.Provider value={selectedMusics}>
                                    <PageNavigator page={curPage} doNext={doNext} onSetUser={setUser} curUser={user}
                                                   setCurPage={setCurPage}/>
                                    <Player onVolumeChange={setVolume} doNext={doNext} onPrev={doPrev}/>
                                </SelectedMusicsCtx.Provider>
                            </SearchFormCtx.Provider>
                        </TracklistCtx.Provider>
                    </TrackplayerCtx.Provider>
                </MetadataCtx.Provider>
            </EditableCtx.Provider>
        </>
    );
}

export default App;
