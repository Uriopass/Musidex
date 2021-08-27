import {useCallback, useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTrackPlayer, newTrackPlayer, setupListeners, TrackplayerCtx} from "./domain/trackplayer";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";

const App = () => {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());
    let [syncProblem, setSyncProblem] = useState(false);

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

    useEffect(() => {
        let v = setInterval(fetchMetadata, 2000);
        return () => clearInterval(v);
    }, [fetchMetadata])

    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [trackplayer, dispatch] = useReducer(applyTrackPlayer, newTrackPlayer());
    let [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);

    trackplayer.audio.volume = volume;
    setupListeners(trackplayer, dispatch);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage} onSync={fetchMetadata}/>
            <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
                <TrackplayerCtx.Provider value={[trackplayer, dispatch]}>
                    <div className="scrollable-element content">
                        <PageNavigator page={curPage} />
                    </div>
                    <Player onVolumeChange={setVolume}/>
                </TrackplayerCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
