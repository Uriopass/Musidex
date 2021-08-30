import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import API from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";
import Tracklist, {
    emptyTracklist,
    TracklistCtx,
    updateCache,
    useCanPrev,
    useNextTrackCallback,
    usePrevTrackCallback
} from "./domain/tracklist";
import {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/entity";
import ReconnectingWebSocket from "reconnecting-websocket";

const App = () => {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());
    let [syncProblem, setSyncProblem] = useState(false);
    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    let [list, setList] = useState<Tracklist>(emptyTracklist())
    let [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);
    let doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata);
    let doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    let canPrev = useCanPrev(list);
    let ws = useRef<undefined | ReconnectingWebSocket>();

    let onMessage = useCallback((ev) => {
        let meta = API.metadataFromWSMsg(ev);
        setMetadata(meta);
        let l = {...list};
        l = updateCache(l, meta);
        setList(l);
    }, [setMetadata, list, setList]);

    useEffect(() => {
        if(ws.current === undefined) {
            ws.current = API.metadataWSInit();
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
    setupListeners(trackplayer, doNext, dispatchPlayer);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage} onSync={fetchMetadata}/>
            <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
                <TrackplayerCtx.Provider value={[trackplayer, dispatchPlayer]}>
                    <TracklistCtx.Provider value={list}>
                        <PageNavigator page={curPage} doNext={doNext}/>
                        <Player onVolumeChange={setVolume} doNext={doNext} onPrev={doPrev} canPrev={canPrev}/>
                    </TracklistCtx.Provider>
                </TrackplayerCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
