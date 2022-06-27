import React, {useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import API from "./common/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {Page} from "./pages/navigator";
import Tracklist, {
    emptyTracklist,
    useNextTrackCallback,
    usePrevTrackCallback
} from "./common/tracklist";
import {EditableCtx, useCookie} from "./components/utils";
import {emptyMusicSelect, MusicSelect, newSearchForm, SearchForm, useMusicSelect} from "./common/filters";
import {MetadataCtx, useMetadata} from "./domain/metadata";
import {Setter} from "./common/utils";
import {firstUser} from "./common/entity";
import ReconnectingWebSocket from "reconnecting-websocket";

export const SearchFormCtx = React.createContext<[SearchForm, Setter<SearchForm>]>([newSearchForm(undefined), _ => _]);
export const SelectedMusicsCtx = React.createContext<MusicSelect>(emptyMusicSelect());
export const TracklistCtx = React.createContext<Tracklist>(emptyTracklist());

export const LoadBeforeApp = () => {
    API.setAPIUrl(window.location.origin);
    const [metadata, setMetadata, loadedMeta] = useMetadata();
    const [syncProblem, setSyncProblem] = useState(false);

    const ws = useRef<ReconnectingWebSocket | undefined>(undefined);

    useEffect(() => {
        if (!loadedMeta) {
            return;
        }
        if (ws.current === undefined) {
            ws.current = API.metadataWSInit();
            ws.current.binaryType = "arraybuffer";
        }

        ws.current.onmessage = async (ev) => {
            let [meta, metaStr] = await API.metadataFromWSMsg(ev, metadata);
            setMetadata(meta, metaStr);
        };
        ws.current.onclose = (_: any) => {
            setSyncProblem(true);
        };
        ws.current.onopen = (_: any) => {
            setSyncProblem(false);
        };
    }, [metadata, setMetadata, setSyncProblem, loadedMeta]);

    let fetchMetadata = useCallback(() => {
        ws.current?.send("refresh");
    }, [ws]);

    if (!loadedMeta) {
        return <div>Loading...</div>;
    }

    return <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
        <App syncProblem={syncProblem}/>
    </MetadataCtx.Provider>;
}

const App = (props: { syncProblem: boolean }) => {
    const [meta,] = useContext(MetadataCtx);
    const [userStr, setUserStr] = useCookie("cur_user", undefined);
    const user = parseInt(userStr || "undefined") || undefined;
    const setUser = useCallback((v: number) => setUserStr(v.toString()), [setUserStr]);
    const _sform = useLocalStorage<SearchForm>("searchform_v2", newSearchForm(user), {syncData: false});
    const [sform, setSform] = _sform;
    const [volume, setVolume] = useLocalStorage("volume", 1, {syncData: false});
    const tp = useReducer(applyTrackPlayer, newTrackPlayer());
    const [trackplayer, dispatchPlayer] = tp;
    const [curPage, setCurPage] = useState<Page>({path: "explorer", submit: false});
    const [list, setList] = useState<Tracklist>(emptyTracklist());
    const editableSt = useState(false);
    const selectedMusics = useMusicSelect(meta, sform, list);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, meta, sform, selectedMusics);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, meta);

    useEffect(() => {
        const musicId = parseInt(new URLSearchParams(window.location.search).get("music_id") || "");
        if (musicId) {
            doNext(musicId);
        }
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (user === undefined || !meta.users.some((u) => u.id === user)) {
            const u = firstUser(meta);
            if (u !== undefined) {
                setUser(u);
                setSform({
                    ...sform,
                    filters: {
                        ...sform.filters,
                        user: u,
                    }
                });
            }
        }
    }, [meta, sform, list, setList, trackplayer, doNext, user, setUser, setSform]);

    trackplayer.audio.volume = volume;
    useMemo(() => setupListeners(trackplayer, meta, doNext, doPrev, dispatchPlayer), [trackplayer, meta, doNext, doPrev, dispatchPlayer]);
    return (
        <>
            <Navbar syncProblem={props.syncProblem}
                    page={curPage} setCurPage={setCurPage}
                    curUser={meta.users.find((x) => x.id === user)}/>
            <EditableCtx.Provider value={editableSt}>
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
            </EditableCtx.Provider>
        </>
    )
        ;
}

export default App;
