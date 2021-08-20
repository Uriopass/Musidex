import React, {useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTracklist, newTracklist, setupListeners, TracklistCtx} from "./domain/tracklist";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./pages/navigator";

function App() {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());
    let [syncCount, setSyncCount] = useState(0);

    useEffect(() => {
        API.getMetadata().then((metadata) => {
            if (metadata == null) return;
            setMetadata(metadata);
        })
    }, [syncCount]);

    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [tracklist, dispatch] = useReducer(applyTracklist, newTracklist());
    let [curPage, setCurPage] = useState("explorer" as PageEnum);

    tracklist.audio.volume = volume;
    setupListeners(tracklist, dispatch);


    return (
        <>
            <Navbar setCurPage={setCurPage} onSync={() => setSyncCount((v) => v+1)}/>
            <MetadataCtx.Provider value={metadata}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="content">
                        <PageNavigator page={curPage} />
                    </div>
                    <Player onVolumeChange={(volume) => setVolume(volume)}/>
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </>
    );
}

export default App;
