import {useCallback, useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTracklist, newTracklist, setupListeners, TracklistCtx} from "./domain/tracklist";
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
    let [tracklist, dispatch] = useReducer(applyTracklist, newTracklist());
    let [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);

    tracklist.audio.volume = volume;
    setupListeners(tracklist, dispatch);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage} onSync={fetchMetadata}/>
            <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="scrollable-element content">
                        <PageNavigator page={curPage} />
                    </div>
                    <Player onVolumeChange={setVolume}/>
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
