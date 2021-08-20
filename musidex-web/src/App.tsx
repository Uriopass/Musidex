import React, {Fragment, useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Player from "./components/player";
import {applyTracklist, newTracklist, setupListeners, TracklistCtx} from "./domain/tracklist";
import useLocalStorage from "use-local-storage";
import PageNavigator, {PageEnum} from "./components/navigator";

function App() {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());

    useEffect(() => {
        API.getMetadata().then((metadata) => {
            if (metadata == null) return;
            setMetadata(metadata);
        })
    }, []);

    let [volume, setVolume] = useLocalStorage("volume", 1);
    let [tracklist, dispatch] = useReducer(applyTracklist, newTracklist());
    let [curPage, setCurPage] = useState("explorer" as PageEnum);

    tracklist.audio.volume = volume;
    setupListeners(tracklist, dispatch);

    return (
        <Fragment>
            <Navbar setCurPage={setCurPage}/>
            <MetadataCtx.Provider value={metadata}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="content">
                        <PageNavigator page={curPage} />
                    </div>
                    <Player onVolumeChange={(volume) => setVolume(volume)}/>
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </Fragment>
    );
}

export default App;
