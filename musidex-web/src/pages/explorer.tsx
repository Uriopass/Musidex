import './explorer.css'
import API from "../domain/api";
import {Fragment, useContext, useState} from "react";
import {PlayButton} from "../components/playbutton";
import {clamp, MaterialIcon} from "../components/utils";
import {canPlay, MetadataCtx, Tag} from "../domain/entity";
import {NextTrackCallback, TracklistCtx} from "../domain/tracklist";

export type ExplorerProps = {
    title: string;
    hidden: boolean;
    doNext: NextTrackCallback;
}

const Explorer = (props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [shown, setShown] = useState(40);
    const list = useContext(TracklistCtx);

    let onScroll = (e: any) => {
        const elem: HTMLDivElement = e.target;
        if (elem.scrollHeight - elem.scrollTop < elem.clientHeight + 500) {
            if (metadata.musics.length > shown) {
                setShown(shown + 20);
            }
        }
    };

    return (
        <div className={"scrollable-element content"  + (props.hidden ? " hidden" : "")} onScroll={onScroll}>
            <div className="explorer color-fg">
                <div className="explorer-title title">{props.title}</div>
                {
                    list.cached_scores.slice(0, shown).map(({id, score}) => {
                        const tags = metadata.music_tags_idx.get(id);
                        if (tags === undefined) {
                            return <Fragment key={id}/>;
                        }
                        return (
                            <SongElem key={id} musicID={id}
                                      tags={tags}
                                      onDelete={() => {
                                          API.deleteMusic(id).then((res) => {
                                              if (res.ok && res.status === 200) {
                                                  syncMetadata()
                                              }
                                          })
                                      }}
                                      doNext={props.doNext}
                                      progress={score}
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
    onDelete: () => void;
    doNext: NextTrackCallback;
    progress?: number,
}

const SongElem = (props: SongElemProps) => {
    const cover = props.tags.get("thumbnail")?.text || null;

    const playable = canPlay(props.tags);
    const hasYT = props.tags.get("youtube_video_id")?.text;
    const goToYT = (id: string) => {
        window.open("https://youtube.com/watch?v=" + id, "_blank")?.focus();
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
                <button className="player-button" onClick={props.onDelete} title="Remove from library">
                    <MaterialIcon name="delete"/>
                </button>
            </div>
        </div>
    )
}


export default Explorer;