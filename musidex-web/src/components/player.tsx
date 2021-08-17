import {MaterialIcon, ProgressBar} from "./utils";
import './player.css'
import {PlayingTrack} from "../domain/tracklist";
import {PlayButton} from "./explorer";

type PlayerProps = {
    track: PlayingTrack | null,
};

function timeFormat(total: number): string {
    let minutes = Math.floor(total / 60);
    let seconds = Math.floor(total % 60);
    return `${minutes}:${seconds < 10 ? "0": ""}${seconds}`
}

const Player = (props: PlayerProps) => {
    let curtime = props.track?.curtime || 0
    let duration = props.track?.track.duration || 0
    let progress = duration > 0 ? curtime / duration : 0;
    let title = (props.track != null) ? (props.track.track.tags.get("title")?.text || "No Title") : "";
    return (
        <div className="player fg color-fg">
            <div className="player-current-track">
                {title}
            </div>
            <div className="player-central-menu">
                <div className="player-controls">
                    <button className="player-button" onClick={() => console.log("hi")}><MaterialIcon size={20} name="skip_previous"/></button>
                    <PlayButton musicID={props.track?.track.id || -2} />
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