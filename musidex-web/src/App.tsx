import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import API from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";
import Tracklist, {
    emptyTracklist,
    TracklistCtx,
    updateScoreCache,
    useCanPrev,
    useNextTrackCallback,
    usePrevTrackCallback
} from "./domain/tracklist";
import {MetadataCtx, useMetadata} from "./domain/entity";
import ReconnectingWebSocket from "reconnecting-websocket";
import {useCookie} from "./components/utils";
import Filters, {newFilters, FiltersCtx} from "./domain/filters";

const App = () => {
    const [metadata, setMetadata] = useMetadata();
    const [userStr, setUserStr] = useCookie("cur_user", undefined);
    const user = parseInt(userStr || "undefined") || undefined;
    const setUser = useCallback((v: number) => setUserStr(v.toString()), [setUserStr]);
    const [filters, setFilters] = useLocalStorage<Filters>("filters", newFilters());
    const [syncProblem, setSyncProblem] = useState(false);
    const [volume, setVolume] = useLocalStorage("volume", 1);
    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const [list, setList] = useState<Tracklist>(emptyTracklist())
    const [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, filters, user);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const canPrev = useCanPrev(list);
    const ws = useRef<undefined | ReconnectingWebSocket>();

    let onMessage = useCallback(async (ev) => {
        let [meta, metaStr] = await API.metadataFromWSMsg(ev);
        if (trackplayer.current && !meta.music_tags_idx.has(trackplayer.current)) {
            doNext();
        }
        setMetadata(meta, metaStr);
        if (user === undefined || !meta.users.some((u) => u.id === user)) {
            const u = meta.firstUser();
            if (u !== undefined) {
                setUser(u);
            }
        }
        let l = {...list};
        l = updateScoreCache(l, meta);
        setList(l);
    }, [setMetadata, list, setList, trackplayer, doNext, user, setUser]);

    useEffect(() => {
        if (ws.current === undefined) {
            ws.current = API.metadataWSInit();
            ws.current.binaryType = "arraybuffer"
        }

        ws.current.onmessage = onMessage;
        ws.current.onclose = (_) => {
            setSyncProblem(true);
        };
        ws.current.onopen = (_) => {
            setSyncProblem(false);
        };
    }, [setSyncProblem, onMessage])

    let fetchMetadata = useCallback(() => {
        ws.current?.send("refresh");
    }, [ws]);

    trackplayer.audio.volume = volume;
    useMemo(() => setupListeners(trackplayer, metadata, doNext, doPrev, dispatchPlayer), [trackplayer, metadata, doNext, doPrev, dispatchPlayer]);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage}
                    curUser={metadata.users.find((x) => x.id === user)}/>
            <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
                <TrackplayerCtx.Provider value={[trackplayer, dispatchPlayer]}>
                    <TracklistCtx.Provider value={list}>
                        <FiltersCtx.Provider value={[filters, setFilters]}>
                            <PageNavigator page={curPage} doNext={doNext} onSetUser={setUser} curUser={user}/>
                            <Player onVolumeChange={setVolume} doNext={doNext} onPrev={doPrev} canPrev={canPrev}/>
                        </FiltersCtx.Provider>
                    </TracklistCtx.Provider>
                </TrackplayerCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
