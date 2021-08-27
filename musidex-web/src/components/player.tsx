import {clamp, MaterialIcon, ProgressBar, useUpdate} from "./utils";
import './player.css'
import {TrackplayerCtx} from "../domain/trackplayer";
import React, {useContext, useEffect} from "react";
import {PlayButton} from "./playbutton";

function timeFormat(total: number): string {
    let minutes = Math.floor(total / 60);
    let seconds = Math.floor(total % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

interface PlayerProps {
    onVolumeChange: (volume: number) => void;
    onNext: () => void;
    onPrev: () => void;
    canPrev: () => boolean;
}

const Player = (props: PlayerProps) => {
    let [trackplayer, dispatch] = useContext(TrackplayerCtx);
    let [, forceUpdate] = useUpdate();

    useEffect(() => {
        trackplayer.audio.addEventListener("timeupdate", forceUpdate);
        return () => trackplayer.audio.removeEventListener("timeupdate", forceUpdate);
    }, [forceUpdate, trackplayer.audio])

    let curtime = trackplayer.audio.currentTime || 0;
    let duration = trackplayer.duration || (trackplayer.current?.tags.get("duration")?.integer || 0);
    let trackProgress = duration > 0 ? curtime / duration : 0;
    let title = (trackplayer.current !== undefined) ? (trackplayer.current.tags.get("title")?.text || "No Title") : "";
    let artist = trackplayer.current?.tags.get("artist")?.text || "";
    let thumbnail = trackplayer.current?.tags.get("thumbnail")?.text || "";

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
        if (p < 0.02) {
            p = 0;
        }
        props.onVolumeChange(p);
    }

    let volumeIcon = "volume_up";
    let v = trackplayer.audio.volume;
    if (v <= 0.5) {
        volumeIcon = "volume_down";
    }
    if (v <= 0.0) {
        volumeIcon = "volume_mute";
    }

    return (
        <div className="player fg color-fg">
            <div className="player-current-track">
                {
                    (thumbnail !== "") &&
                    <div className="player-current-track-thumbnail">
                        <img src={"storage/" + thumbnail} alt="song cover"/>
                    </div>
                }
                <div className="player-current-track-title">
                    {title}
                    <br/>
                    <span className="small gray-fg">
                        {artist}
                    </span>
                </div>
            </div>
            <div className="player-central-menu">
                <div className="player-controls">
                    <button className="player-button" onClick={props.onPrev} disabled={props.canPrev()}>
                        <MaterialIcon size={20}
                                      name="skip_previous"/>
                    </button>
                    <PlayButton musicID={trackplayer.current?.id || -2}/>
                    <button className=" player-button" onClick={props.onNext}>
                        <MaterialIcon size={20}
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
                    <ProgressBar onMouseMove={volumeOnMove} progress={trackplayer.audio.volume}/>
                    <div style={{flex: 1}}/>
                </div>
            </div>
        </div>
    )
}

export default Player;