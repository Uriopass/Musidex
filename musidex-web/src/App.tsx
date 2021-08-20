import React, {Fragment, useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Explorer from "./components/explorer";
import Player from "./components/player";
import {applyTracklist, newTracklist, setupListeners, TracklistCtx} from "./domain/tracklist";
import useLocalStorage from "use-local-storage";

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

    tracklist.audio.volume = volume;
    setupListeners(tracklist, dispatch);

    return (
        <Fragment>
            <Navbar/>
            <MetadataCtx.Provider value={metadata}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="content">
                        <Explorer title="Musics" metadata={metadata}/>
                    </div>
                    <Player onVolumeChange={(volume) => setVolume(volume)}/>
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </Fragment>
    );
}

export default App;
