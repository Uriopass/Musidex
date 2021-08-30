import './explorer.css'
import API from "../domain/api";
import {Fragment, useContext} from "react";
import {PlayButton} from "../components/playbutton";
import {clamp, MaterialIcon} from "../components/utils";
import {canPlay, MetadataCtx, Tag} from "../domain/entity";
import {getLastvec, getScore, NextTrackCallback, TracklistCtx} from "../domain/tracklist";
import {TrackplayerCtx} from "../domain/trackplayer";

export type ExplorerProps = {
    title: string;
    hidden: boolean;
    doNext: NextTrackCallback;
}

const Explorer = (props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [player] = useContext(TrackplayerCtx);
    const list = useContext(TracklistCtx);

    let lastvec = getLastvec(list, metadata, player.current?.id);

    return (
        <div className={"explorer color-fg " + (props.hidden ? "hidden" : "")}>
            <div className="explorer-title title">{props.title}</div>
            {
                metadata.musics.map((id) => {
                    return (
                        <SongElem key={id} musicID={id}
                                  tags={metadata.music_tags_idx.get(id)}
                                  onDelete={() => {
                                      API.deleteMusic(id).then((res) => {
                                          if (res.ok && res.status === 200) {
                                              syncMetadata()
                                          }
                                      })
                                  }}
                                  doNext={props.doNext}
                                  progress={getScore(list, lastvec, id, metadata)}
                        />
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
    doNext: NextTrackCallback;
    progress?: number;
}

const SongElem = (props: SongElemProps) => {
    if (props.tags === undefined) {
        return <Fragment/>;
    }
    const cover = props.tags.get("thumbnail")?.text || null;

    const playable = canPlay(props.tags);
    const hasYT = props.tags.get("youtube_video_id")?.text;
    const goToYT = (id: string) => {
        window.open("https://youtube.com/watch?v="+id, "_blank")?.focus();
    };

    const c = `#28222f`;
    const p = clamp(100 * (props.progress || 0), 0, 100);
    const grad = `linear-gradient(90deg, ${c} 0%, ${c} ${p}%, var(--fg) ${p}%, var(--fg) 100%)`;

    return (
        <div className="song-elem" style={{background: grad}}>
            <div className="cover-image-container">
                {
                    (cover !== null) &&
                    <img src={"storage/" + cover} alt="album or video cover" loading="lazy"/>
                }
            </div>
            <div style={{flex: "3", padding: "10px"}}>
                <b>
                    {props.tags.get("title")?.text || "No Title"}
                </b>
                <br/>
                <span className="small gray-fg">
                    {props.tags.get("artist")?.text || ""}
                </span>
            </div>
            <div style={{flex: "1", padding: "10px", textAlign: "right"}}>
                {
                    hasYT &&
                    <button className="player-button" onClick={() => goToYT(hasYT)} style={{marginRight: "4px"}}>
                        <img src="yt_icon.png" width={20} height={20}/>
                    </button>
                }
                {
                    playable &&
                    <PlayButton doNext={props.doNext} musicID={props.musicID}/>
                }
                <button className="player-button" onClick={props.onDelete} title="Remove from library">
                    <MaterialIcon name="delete"/>
                </button>
            </div>
        </div>
    )
}


export default Explorer;