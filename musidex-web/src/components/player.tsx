import {MaterialIcon, ProgressBar} from "./utils";
import './player.css'
import {TrackplayerCtx} from "../domain/trackplayer";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {PlayButton} from "./playbutton";
import {NextTrackCallback} from "../common/tracklist";
import {MetadataCtx} from "../domain/metadata";
import {clamp, timeFormat, useUpdate} from "../common/utils";
import {getTags} from "../common/entity";
import {TracklistCtx} from "../App";
import {enableNoSleep} from "../index";

interface PlayerProps {
    onVolumeChange: (volume: number) => void;
    doNext: NextTrackCallback;
    onPrev: () => void;
}

const Player = (props: PlayerProps) => {
    const [trackplayer, dispatch] = useContext(TrackplayerCtx);
    const list = useContext(TracklistCtx);
    const [metadata,] = useContext(MetadataCtx);
    const [, forceUpdate] = useUpdate();

    useEffect(() => {
        trackplayer.audio.addEventListener("timeupdate", forceUpdate);
        return () => trackplayer.audio.removeEventListener("timeupdate", forceUpdate);
    }, [forceUpdate, trackplayer.audio])

    const tags = getTags(metadata, trackplayer.current);
    const curtime = trackplayer.audio.currentTime || 0;
    const duration = tags?.get("duration")?.integer || trackplayer.duration;
    const trackProgress = duration > 0 ? curtime / duration : 0;
    const title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "";
    const artist = tags?.get("artist")?.text || "";
    const thumbnail = tags?.get("compressed_thumbnail")?.text || (tags?.get("thumbnail")?.text || "");

    const trackBarOnMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        if (ev.buttons !== 1) return;
        const x = ev.pageX - ev.currentTarget.offsetLeft;
        if (ev.currentTarget.offsetWidth <= 1 || duration <= 1) {
            return;
        }
        const p = (x * duration) / ev.currentTarget.offsetWidth;
        dispatch({action: "setTime", time: p});
    }

    const volumeOnMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        if (ev.buttons !== 1) return;
        const x = ev.pageX - ev.currentTarget.offsetLeft;
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
    const v = trackplayer.audio.volume;
    if (v <= 0.5) {
        volumeIcon = "volume_down";
    }
    if (v <= 0.0) {
        volumeIcon = "volume_mute";
    }

    const doNext = props.doNext;
    const clickNext = useCallback(() => {
        doNext();
        enableNoSleep();
    }, [doNext]);

    const [loop, setLoop] = useState(false);
    const clickLoop = useCallback(() => {
        setLoop(!loop);
        dispatch({
            action: "loop",
            shouldLoop: !loop,
        });
    }, [loop, setLoop, dispatch]);

    let buffered: [number, number][] = [];
    if (trackplayer.duration > 1) {
        buffered = Array(trackplayer.audio.buffered.length).fill(0).map((_, idx) => {
            const s = Math.max(0, trackplayer.audio.buffered.start(idx) / trackplayer.duration);
            const e = Math.min(1, trackplayer.audio.buffered.end(idx) / trackplayer.duration);
            return [s, e - s];
        })
    }

    const canPrev = list.last_played.length > 1;

    return (
        <div className="player fg color-fg">
            <div className="player-current-track">
                {
                    (thumbnail !== "") &&
                    <div className="player-current-track-thumbnail">
                        <img src={"storage/" + thumbnail} alt="song cover"
                             style={{animationPlayState: trackplayer.paused ? "paused" : "running"}}/>
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
                    <div className="player-button">
                    </div>
                    <button className="player-button" onClick={props.onPrev} disabled={!canPrev} title="Previous Track">
                        <MaterialIcon size={20}
                                      name="skip_previous"/>
                    </button>
                    <PlayButton musicID={trackplayer.current} doNext={props.doNext} size={26}/>
                    <button className="player-button" onClick={clickNext} title="Next Track">
                        <MaterialIcon size={20}
                                      name="skip_next"/>
                    </button>
                    <button className={"loop-button " + (loop ? "loop-button-enabled" : "")} onClick={clickLoop} title="Loop this music">
                        <MaterialIcon size={20}
                                      name="repeat_one"/>
                    </button>
                </div>
                <div className="player-track-bar">
                    <span className="player-track-info">
                        {timeFormat(curtime)}
                    </span>
                    <ProgressBar onMouseMove={trackBarOnMove} progress={trackProgress} buffered={buffered}/>
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