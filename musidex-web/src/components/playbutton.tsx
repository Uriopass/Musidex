import {useContext} from "react";
import {TrackplayerCtx} from "../domain/trackplayer";
import {buildTrack, MetadataCtx} from "../domain/api";
import {MaterialIcon} from "./utils";

export type PlayButtonProps = {
    musicID: number;
}

export const PlayButton = (props: PlayButtonProps) => {
    let [trackplayer, dispatch] = useContext(TrackplayerCtx);
    let [metadata,] = useContext(MetadataCtx);
    let same_v = (trackplayer.current?.id || -1) === props.musicID;
    let title = metadata.music_tags_idx.get(props.musicID || -1)?.get("title")?.text || "No Title";

    let onClick = () => {
        let track = buildTrack(props.musicID, metadata);
        if (track === null) return;
        dispatch({action: "play", track: track})
    };

    let titlePrefix = "Play ";
    let icon;

    if (same_v) {
        if (trackplayer.loading) {
            icon = "pending";
            titlePrefix = "Loading ";
        } else if (trackplayer.paused) {
            icon = "play_arrow";
        } else {
            icon = "pause";
            titlePrefix = "Pause ";
        }
    } else {
        icon = "play_arrow";
    }

    return (
        <button className="player-button" onClick={onClick} title={titlePrefix + title}>
            <MaterialIcon name={icon}/>
        </button>
    )
}