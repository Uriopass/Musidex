import './explorer.css'
import API from "../domain/api";
import React, {Fragment, useContext, useState} from "react";
import {PlayButton} from "../components/playbutton";
import {clamp, MaterialIcon} from "../components/utils";
import {canPlay, MetadataCtx, Tag} from "../domain/entity";
import {NextTrackCallback, TracklistCtx} from "../domain/tracklist";
import TextInput from "../components/input";

export type ExplorerProps = {
    title: string;
    hidden: boolean;
    doNext: NextTrackCallback;
}

const Explorer = (props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [shown, setShown] = useState(40);
    const list = useContext(TracklistCtx);
    const [searchQry, setSearchQry] = useState("");
    console.log(searchQry);

    let cur: number | undefined = list.last_played[list.last_played.length - 1];
    let onScroll = (e: any) => {
        const elem: HTMLDivElement = e.target;
        if (elem.scrollHeight - elem.scrollTop < elem.clientHeight + 500) {
            if (metadata.musics.length > shown) {
                setShown(shown + 20);
            }
        }
    };

    const colorCur = "#1d2f23";
    const colorSongs = "#28222f";
    let curPlaying = <></>;
    if (cur) {
        const tags = metadata.music_tags_idx.get(cur);
        if (tags !== undefined) {
            curPlaying =
                <SongElem musicID={cur}
                          doNext={props.doNext}
                          syncMetadata={syncMetadata}
                          tags={tags}
                          progress={1.0}
                          progressColor={colorCur}/>;
        }
    }

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")} onScroll={onScroll}>
            <div className="explorer color-fg">
                <div className="explorer-search">
                    <TextInput onChange={setSearchQry} name="Search"/>
                </div>
                {curPlaying}
                {
                    list.cached_scores.slice(0, shown).map(({id, score}) => {
                        if (id === cur) {
                            return <Fragment key={id}/>;
                        }
                        const tags = metadata.music_tags_idx.get(id);
                        if (tags === undefined) {
                            return <Fragment key={id}/>;
                        }
                        return (
                            <SongElem key={id} musicID={id}
                                      tags={tags}
                                      syncMetadata={syncMetadata}
                                      doNext={props.doNext}
                                      progress={score}
                                      progressColor={colorSongs}
                            />
                        )
                    })
                }
                {
                    (shown < metadata.musics.length) && (
                        <button style={{marginTop: "10px"}} onClick={() => setShown(shown + 20)}>
                            Show more
                        </button>
                    )
                }
            </div>
        </div>
    )
}

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
    doNext: NextTrackCallback;
    syncMetadata: () => void;
    progress?: number,
    progressColor?: string;
}

const SongElem = (props: SongElemProps) => {
    const cover = props.tags.get("thumbnail")?.text || null;

    const playable = canPlay(props.tags);
    const hasYT = props.tags.get("youtube_video_id")?.text;
    const goToYT = (id: string) => {
        window.open("https://youtube.com/watch?v=" + id, "_blank")?.focus();
    };

    const c = props.progressColor;
    const p = clamp(100 * (props.progress || 0), 0, 100);
    const grad = `linear-gradient(90deg, ${c} 0%, ${c} ${p}%, var(--fg) ${p}%, var(--fg) 100%)`;

    let onDelete = () => {
        API.deleteMusic(props.musicID).then((res) => {
            if (res.ok && res.status === 200) {
                props.syncMetadata()
            }
        })
    };

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
            <div style={{flex: "2", padding: "0 10px", textAlign: "right"}}>
                {
                    hasYT &&
                    <button className="player-button" onClick={() => goToYT(hasYT)}>
                        <img src="yt_icon.png" width={20} height={20} alt="Go to Youtube"/>
                    </button>
                }
                {
                    playable &&
                    <PlayButton doNext={props.doNext} musicID={props.musicID}/>
                }
                <button className="player-button" onClick={onDelete} title="Remove from library">
                    <MaterialIcon name="delete"/>
                </button>
            </div>
        </div>
    )
}


export default Explorer;