import React, {useEffect, useReducer, useState} from 'react';
import API, {emptyMetadata, MetadataCtx, MusidexMetadata} from "./domain/api";
import Navbar from "./components/navbar";
import Explorer from "./components/explorer";
import Player from "./components/player";
import {applyTracklist, emptyTracklist, TracklistCtx} from "./domain/tracklist";

function App() {
    let [metadata, setMetadata] = useState<MusidexMetadata>(emptyMetadata());

    useEffect(() => {
        API.getMetadata().then((metadata) => {
            if (metadata == null) return;
            setMetadata(metadata);
        })
    }, []);

    let [tracklist, dispatch] = useReducer(applyTracklist, emptyTracklist())

    tracklist.audio.onloadeddata = () => dispatch({action: "audioTick"});
    tracklist.audio.onplaying = () => dispatch({action: "audioTick"});
    tracklist.audio.onpause = () => dispatch({action: "audioTick"});

    return (
        <div className="color-bg bg" style={{textAlign: "center"}}>
            <Navbar/>

            <MetadataCtx.Provider value={metadata}>
                <TracklistCtx.Provider value={[tracklist, dispatch]}>
                    <div className="container">
                        <Explorer title="Musics" metadata={metadata}/>
                    </div>
                    <Player />
                </TracklistCtx.Provider>
            </MetadataCtx.Provider>
        </div>
    );
}

export default App;
