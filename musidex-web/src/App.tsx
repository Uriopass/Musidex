import {useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTracklist, newTracklist, setupListeners, TracklistCtx} from "./domain/tracklist";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";
import {clearInterval} from "timers";

const App = () => {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());
    let [metadataSc, updateMetadata] = useState(0);
    let [syncProblem, setSyncProblem] = useState(false);

    useEffect(() => {
        API.getMetadata().then((fmetadata) => {
            setSyncProblem(fmetadata === null);
            if (fmetadata === null || fmetadata.hash === metadata.hash) {
                return;
            }
            setMetadata(fmetadata);
        })
    }, [metadataSc]);

    useEffect(() => {
        let v = setInterval(() => {
            updateMetadata((v) => v+1)
        }, 2000)
        
        return () => clearInterval(v);
    }, [])

    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [tracklist, dispatch] = useReducer(applyTracklist, newTracklist());
    let [curPage, setCurPage] = useLocalStorage("curpage", "explorer" as PageEnum);

    tracklist.audio.volume = volume;
    setupListeners(tracklist, dispatch);

    return (
        <>
            <Navbar syncProblem={syncProblem} setCurPage={setCurPage} onSync={() => updateMetadata((v) => v+1)}/>
            <MetadataCtx.Provider value={[metadata, () => updateMetadata((v) => v+1)]}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="scrollable-element content">
                        <PageNavigator page={curPage} />
                    </div>
                    <Player onVolumeChange={(volume) => setVolume(volume)}/>
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
