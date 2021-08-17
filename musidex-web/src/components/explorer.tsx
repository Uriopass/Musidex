import './explorer.css'
import {buildTrack, MetadataCtx, MusidexMetadata, Tag} from "../domain/api";
import {Fragment, useContext} from "react";
import {MaterialIcon} from "./utils";
import {TracklistCtx} from "../domain/tracklist";

export type ExplorerProps = {
    title: string;
    metadata: MusidexMetadata | null,
}

const Explorer = (props: ExplorerProps) => {
    return (
        <div className="explorer color-fg">
            <div className="explorer-title title">{props.title}</div>
            {
                props.metadata?.musics.map((music) => {
                    return (
                        <SongElem key={music.id} musicID={music.id} tags={props.metadata?.music_tags_idx.get(music.id)}/>
                    )
                })
            }
        </div>
    )
}

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag> | undefined;
}

const SongElem = (props: SongElemProps) => {
    if (props.tags === undefined) {
        return <Fragment/>;
    }
    return (
        <div className="song-elem">
            <div style={{width: "80px", height: "80px", backgroundColor: "gray"}}/>
            <div style={{flex: "1", padding: "10px"}}>
                <b>
                    {props.tags.get("title")?.text || "No Title"}
                </b>
            </div>
            <div style={{flex: "1", padding: "10px", textAlign: "right"}}>
                <PlayButton musicID={props.musicID}/>
            </div>
        </div>
    )
}

export type PlayButtonProps = {
    musicID: number;
}

export const PlayButton = (props: PlayButtonProps) => {
    let [tracklist, dispatch] = useContext(TracklistCtx);
    let metadata = useContext(MetadataCtx);
    let same_v = (tracklist.current?.track.id || -1) === props.musicID;

    let onClick = () => {
        let track = buildTrack(props.musicID, metadata);
        if(track === null) return;
        dispatch({action: "play", track: track})
    };
    return (
        <button className="player-button" onClick={onClick}>
            {
                (same_v && (!tracklist.current?.paused || false)) ? <MaterialIcon name="pause"/> : <MaterialIcon name="play_arrow"/>
            }
        </button>
    )
}

export default Explorer;