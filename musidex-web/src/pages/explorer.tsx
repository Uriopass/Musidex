import './explorer.css'
import API, {MetadataCtx, Tag} from "../domain/api";
import {Fragment, useContext} from "react";
import {PlayButton} from "../components/playbutton";
import {MaterialIcon} from "../components/utils";

export type ExplorerProps = {
    title: string;
    hidden: boolean;
}

const Explorer = (props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    return (
        <div className={"explorer color-fg " + (props.hidden ? "hidden" : "")}>
            <div className="explorer-title title">{props.title}</div>
            {
                metadata.musics.map((music) => {
                    return (
                        <SongElem key={music.id} musicID={music.id}
                                  tags={metadata.music_tags_idx.get(music.id)}
                        onDelete={() => {
                            API.deleteMusic(music.id).then((res) => {
                                if (res.ok && res.status === 200) {
                                    syncMetadata()
                                }
                            })
                        }}/>
                    )
                })
            }
        </div>
    )
}

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag> | undefined;
    onDelete: () => void;
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
                <button className="player-button" onClick={props.onDelete}>
                    <MaterialIcon name="remove"/>
                </button>
            </div>
        </div>
    )
}



export default Explorer;