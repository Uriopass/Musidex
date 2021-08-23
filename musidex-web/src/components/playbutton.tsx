import {useContext} from "react";
import {TracklistCtx} from "../domain/tracklist";
import {buildTrack, MetadataCtx} from "../domain/api";
import {MaterialIcon} from "./utils";

export type PlayButtonProps = {
    musicID: number;
}

export const PlayButton = (props: PlayButtonProps) => {
    let [tracklist, dispatch] = useContext(TracklistCtx);
    let [metadata,] = useContext(MetadataCtx);
    let same_v = (tracklist.current?.id || -1) === props.musicID;

    let onClick = () => {
        let track = buildTrack(props.musicID, metadata);
        if (track === null) return;
        dispatch({action: "play", track: track})
    };

    let chooseIcon = () => {
        if (same_v) {
            if (tracklist.loading) {
                return <MaterialIcon name="pending"/>
            } else if (tracklist.paused) {
                return <MaterialIcon name="play_arrow"/>
            } else {
                return <MaterialIcon name="pause"/>
            }
        } else {
            return <MaterialIcon name="play_arrow"/>
        }
    }

    return (
        <button className="player-button" onClick={onClick}>
            {
                chooseIcon()
            }
        </button>
    )
}