import {useCallback, useEffect, useReducer, useState} from 'react';
import API from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";
import Tracklist, {emptyTracklist, useCanPrev, useNextTrackCallback, usePrevTrackCallback} from "./domain/tracklist";
import {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/entity";

const App = () => {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());
    let [syncProblem, setSyncProblem] = useState(false);
    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    let [list, setList] = useState<Tracklist>(emptyTracklist())
    let [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);
    let onNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, trackplayer.current?.id);
    let onPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    let canPrev = useCanPrev(list);

    let fetchMetadata = useCallback(() => {
        API.getMetadata().then((fmetadata) => {
            let sp = fmetadata === null;
            if (syncProblem !== sp) {
                setSyncProblem(sp);
            }
            if (fmetadata === null || fmetadata.hash === metadata.hash) {
                return;
            }
            setMetadata(fmetadata);
        })
    }, [syncProblem, metadata]);

    // eslint-disable-next-line
    useEffect(fetchMetadata, []);

    useEffect(() => {
        let v = setInterval(fetchMetadata, 2000);
        return () => clearInterval(v);
    }, [fetchMetadata])

    trackplayer.audio.volume = volume;
    setupListeners(trackplayer, onNext, dispatchPlayer);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage} onSync={fetchMetadata}/>
            <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
                <TrackplayerCtx.Provider value={[trackplayer, dispatchPlayer]}>
                    <div className="scrollable-element content">
                        <PageNavigator page={curPage}/>
                    </div>
                    <Player onVolumeChange={setVolume} onNext={onNext} onPrev={onPrev} canPrev={canPrev}/>
                </TrackplayerCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
