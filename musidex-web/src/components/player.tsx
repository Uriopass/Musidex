import {clamp, MaterialIcon, ProgressBar} from "./utils";
import './player.css'
import {TracklistCtx} from "../domain/tracklist";
import React, {useContext, useEffect, useState} from "react";
import {PlayButton} from "./playbutton";

function timeFormat(total: number): string {
    let minutes = Math.floor(total / 60);
    let seconds = Math.floor(total % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

interface PlayerProps {
    onVolumeChange: (volume: number) => void;
}

const Player = (props: PlayerProps) => {
    let [tracklist, dispatch] = useContext(TracklistCtx);
    let forceUpdate = useState(1)[1];

    useEffect(() => {
        let h = () => forceUpdate((v) => v + 1);
        tracklist.audio.addEventListener("timeupdate", h);
        return () => tracklist.audio.removeEventListener("timeupdate", h);
    }, [forceUpdate, tracklist.audio])

    let curtime = tracklist.audio.currentTime || 0;
    let duration = tracklist.duration || 0;
    let trackProgress = duration > 0 ? curtime / duration : 0;
    let title = (tracklist.current != null) ? (tracklist.current.tags.get("title")?.text || "No Title") : "";

    let trackBarOnMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        if (ev.buttons !== 1) return;
        let x = ev.pageX - ev.currentTarget.offsetLeft;
        if (ev.currentTarget.offsetWidth <= 1 || duration <= 1) {
            return;
        }
        let p = (x * duration) / ev.currentTarget.offsetWidth;
        dispatch({action: "setTime", time: p});
    }

    let volumeOnMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        if (ev.buttons !== 1) return;
        let x = ev.pageX - ev.currentTarget.offsetLeft;
        if (ev.currentTarget.offsetWidth <= 1) {
            return;
        }
        let p = x / ev.currentTarget.offsetWidth;
        p = clamp(p, 0, 1);
        if(p < 0.02) {
            p = 0;
        }
        props.onVolumeChange(p);
    }

    let volumeIcon = "volume_up";
    let v = tracklist.audio.volume;
    if(v <= 0.5) {
        volumeIcon = "volume_down";
    }
    if(v <= 0.0) {
        volumeIcon = "volume_mute";
    }

    return (
        <div className="player fg color-fg">
            <div className="player-current-track">
                <span style={{padding: 10}}>
                    {title}
                </span>
            </div>
            <div className="player-central-menu">
                <div className="player-controls">
                    <button className="player-button" onClick={() => console.log("prev")}><MaterialIcon size={20}
                                                                                                        name="skip_previous"/>
                    </button>
                    <PlayButton musicID={tracklist.current?.id || -2}/>
                    <button className=" player-button" onClick={() => console.log("next")}><MaterialIcon size={20}
                                                                                                         name=" skip_next"/>
                    </button>
                </div>
                <div className="player-track-bar">
                    <span className="player-track-info">
                        {timeFormat(curtime)}
                    </span>
                    <ProgressBar onMouseMove={trackBarOnMove} progress={trackProgress}/>
                    <span className="player-track-info">
                        {timeFormat(duration)}
                    </span>
                </div>
            </div>
            <div className="player-global-controls">
                <div className="player-volume">
                    <span className="player-track-info">
                        <MaterialIcon size={15} name={volumeIcon}/>
                    </span>
                    <ProgressBar onMouseMove={volumeOnMove} progress={tracklist.audio.volume}/>
                    <div style={{flex: 1}}/>
                </div>
            </div>
        </div>
    )
}

export default Player;