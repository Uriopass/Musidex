import {useCallback, useContext} from "react";
import {TrackplayerCtx} from "../domain/trackplayer";
import {MaterialIcon} from "./utils";
import {MetadataCtx} from "../domain/entity";

export type PlayButtonProps = {
    musicID?: number;
    doNext: (id?: number) => void;
}

export const PlayButton = ({doNext, musicID}: PlayButtonProps) => {
    let [trackplayer] = useContext(TrackplayerCtx);
    let [metadata,] = useContext(MetadataCtx);
    let same_v = (trackplayer.current?.id || -1) === musicID;
    let title = metadata.music_tags_idx.get(musicID || -1)?.get("title")?.text || "No Title";

    let onClick = useCallback(() => {
        doNext(musicID);
    }, [doNext, musicID]);

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