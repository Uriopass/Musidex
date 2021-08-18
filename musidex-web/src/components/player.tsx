import {MaterialIcon, ProgressBar} from "./utils";
import './player.css'
import {TracklistCtx} from "../domain/tracklist";
import {PlayButton} from "./explorer";
import {useContext, useEffect, useState} from "react";

type PlayerProps = {};

function timeFormat(total: number): string {
    let minutes = Math.floor(total / 60);
    let seconds = Math.floor(total % 60);
    return `${minutes}:${seconds < 10 ? "0": ""}${seconds}`
}

const Player = (props: PlayerProps) => {
    let tracklist = useContext(TracklistCtx)[0];
    let forceUpdate = useState(1)[1];

    useEffect(() => {
        setInterval(() => forceUpdate((v) => v+1), 250);
    }, [])

    let curtime = tracklist.audio.currentTime || 0;
    let duration = tracklist.duration || 0;
    let progress = duration > 0 ? curtime / duration : 0;
    let title = (tracklist.current != null) ? (tracklist.current.tags.get("title")?.text || "No Title") : "";
    return (
        <div className="player fg color-fg">
            <div className="player-current-track">
                {title}
            </div>
            <div className="player-central-menu">
                <div className="player-controls">
                    <button className="player-button" onClick={() => console.log("hi")}><MaterialIcon size={20} name="skip_previous"/></button>
                    <PlayButton musicID={tracklist.current?.id || -2} />
                    <button className=" player-button" onClick={() => console.log(" hi")}><MaterialIcon size={20} name=" skip_next"/></button>
                </div>
                <div className=" player-track-bar">
                    <span className=" player-track-info">
                        {timeFormat(curtime)}
                    </span>
                    <ProgressBar progress={progress}/>
                    <span className=" player-track-info">
                        {timeFormat(duration)}
                    </span>
                </div>
            </div>
            <div className=" player-global-controls">

            </div>
        </div>
    )
}

export default Player;