import './explorer.css'
import API from "../common/api";
import React, {Fragment, useContext, useState} from "react";
import {EditableText, MaterialIcon} from "../components/utils";
import {canPlay, getTags, Tag} from "../common/entity";
import {NextTrackCallback} from "../common/tracklist";
import TextInput from "../components/input";
import {PageProps} from "./navigator";
import Filters, {SortBy, sortby_kind_eq, SortByKind, useMusicSelect} from "../common/filters";
import {MetadataCtx} from "../domain/metadata";
import {FiltersCtx, TracklistCtx} from "../App";
import {clamp, Setter} from "../common/utils";
import useLocalStorage from "use-local-storage";
import noCoverImg from "../no_cover.jpg";

export interface ExplorerProps extends PageProps {
    title?: string;
    doNext: NextTrackCallback;
    curUser?: number;
}

const Explorer = React.memo((props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [filters, setFilters] = useContext(FiltersCtx);
    const list = useContext(TracklistCtx);
    const [shown, setShown] = useState(40);
    const [searchQry, setSearchQry] = useState("");
    const [sortBy, setSortBy] = useLocalStorage<SortBy>("sortby", {kind: {kind: "similarity"}, descending: true})

    const curTrack: number | undefined = list.last_played[list.last_played.length - 1];
    const onScroll = (e: any) => {
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
    if (curTrack) {
        const tags = getTags(metadata, curTrack) || new Map();
        curPlaying =
            <>
                <div style={{marginTop: 10}}/>
                <SongElem musicID={curTrack}
                          doNext={props.doNext}
                          syncMetadata={syncMetadata}
                          tags={tags}
                          curUser={props.curUser}
                          progress={1.0}
                          progressColor={colorCur}/>
                <div style={{marginTop: 10}}/>
            </>;
    }
    let toShow = useMusicSelect(metadata, searchQry, sortBy, list, filters, props.curUser);

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")} onScroll={onScroll}>
            <div className="explorer color-fg">
                <div className="explorer-search">
                    <TextInput onChange={setSearchQry} name="Search"/>
                </div>
                {curPlaying}
                <SortBySelect forced={(searchQry !== "") ? "Query match score" : undefined} sortBy={sortBy}
                              setSortBy={setSortBy}
                              hasSimilarity={curTrack !== undefined}/>
                <FilterBySelect filters={filters}
                                setFilters={setFilters}/>
                {
                    toShow.slice(0, shown).map((id) => {
                        if (id === curTrack && sortBy.kind.kind === "similarity") {
                            return <Fragment key={id}/>;
                        }
                        const tags = getTags(metadata, id);
                        if (tags === undefined) {
                            return <Fragment key={id}/>;
                        }
                        let score = list.score_map.get(id);
                        return (
                            <SongElem key={id} musicID={id}
                                      tags={tags}
                                      curUser={props.curUser}
                                      syncMetadata={syncMetadata}
                                      doNext={props.doNext}
                                      progress={score}
                                      progressColor={colorSongs}
                            />
                        )
                    })
                }
                {
                    (shown < toShow.length) && (
                        <button style={{marginTop: "10px"}} onClick={() => setShown(shown + 20)}>
                            Show more
                        </button>
                    )
                }
            </div>
        </div>
    )
})

type FilterBySelectProps = {
    filters: Filters,
    setFilters: Setter<Filters>,
}

const FilterBySelect = React.memo((props: FilterBySelectProps) => {
    let onMySongsChange = (x: any) => {
        props.setFilters({
            ...props.filters,
            user_only: x.target.checked,
        });
    };

    return <div className="sortfilter-select">
        Filter by:
        <div className="filter-elem">
            <input id="filterBy"
                   checked={props.filters.user_only}
                   type={"checkbox"}
                   onChange={onMySongsChange}/>
            <label htmlFor="filterBy">My Songs</label>
        </div>
    </div>
})

type SortBySelectProps = {
    forced?: string;
    sortBy: SortBy,
    setSortBy: Setter<SortBy>,
    hasSimilarity: boolean,
}

const SortBySelect = React.memo((props: SortBySelectProps) => {
    let SortByElem = (props2: { sort: SortByKind, name: string }) => {
        let is_same = sortby_kind_eq(props.sortBy.kind, props2.sort)
        let on_click = () => {
            let new_desc = true;
            if (is_same) {
                new_desc = !props.sortBy.descending;
            }
            props.setSortBy({kind: props2.sort, descending: new_desc});
        }
        return <button className={"sort-by-elem " + (is_same ? " sort-by-selected" : "")}
                       onClick={on_click}>
            {props2.name}
            {
                (is_same) &&
                (
                    props.sortBy.descending ?
                        <MaterialIcon name="south" size={11}/>
                        :
                        <MaterialIcon name="north" size={11}/>
                )
            }
        </button>
    }

    if (props.forced !== undefined) {
        return <div className="sortfilter-select">
            Sort By:
            <span className="sort-by-forced">
                {props.forced}
            </span>
        </div>;
    }

    return <div className="sortfilter-select">
        Sort By:
        {props.hasSimilarity &&
        <SortByElem sort={{kind: "similarity"}} name="Similarity"/>
        }
        <SortByElem sort={{kind: "tag", value: "title"}} name="Title"/>
        <SortByElem sort={{kind: "creation_time"}} name="Last added"/>
    </div>;
})

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
    doNext: NextTrackCallback;
    syncMetadata: () => void;
    progress?: number,
    progressColor?: string;
    curUser?: number;
}

const SongElem = React.memo((props: SongElemProps) => {
    let cover = props.tags?.get("compressed_thumbnail")?.text || props.tags?.get("thumbnail")?.text;

    const playable = canPlay(props.tags);
    const hasYT = props.tags.get("youtube_video_id")?.text;
    const goToYT = () => {
        window.open("https://youtube.com/watch?v=" + hasYT, "_blank")?.focus();
    };

    const c = props.progressColor;
    const p = clamp(100 * (props.progress || 0), 0, 100);
    const grad = `linear-gradient(90deg, ${c} 0%, ${c} ${p}%, var(--fg) ${p}%, var(--fg) 100%)`;

    const onDelete = () => {
        API.deleteMusic(props.musicID).then((res) => {
            if (res.ok && res.status === 200) {
                props.syncMetadata()
            }
        })
    };

    const onAddToLibrary = () => {
        if (!props.curUser) {
            return;
        }
        API.insertTag({music_id: props.musicID, key: "user_library:" + props.curUser}).then(() => props.syncMetadata());
    }
    const showAddToLibrary = props.curUser !== undefined && !props.tags.has("user_library:" + props.curUser);

    const title = props.tags.get("title") || {music_id: props.musicID, key: "title", text: "No Title"};
    const artist = props.tags.get("artist") || {music_id: props.musicID, key: "artist", text: "Unknown Artist"};

    const onNext = () => {
        if (!playable) {
            return;
        }
        props.doNext(props.musicID);
    }

    return (
        <div className={`song-elem ${playable ? "" : "song-elem-disabled"}`}
             style={{background: grad}}>
            <div className={`cover-image-container ${playable ? "song-elem-playable": ""}`} onClick={onNext}>
                {
                    (cover) ?
                        <img src={"storage/" + cover} alt="album or video cover" loading="lazy"/> :
                        <img src={noCoverImg} alt="album or video cover"/>
                }
            </div>
            <div style={{paddingLeft: "10px"}}>
                <b>
                    <EditableText text={title.text || ""}
                                  onRename={(v) => API.insertTag({...title, text: v})}/>
                </b>
                <br/>
                <span className="small gray-fg">
                    <EditableText text={artist.text || ""}
                                  onRename={(v) => API.insertTag({...artist, text: v})}/>
                </span>
            </div>
            <div className={`${playable ? "song-elem-playable": ""}`} style={{flexBasis: 0, flexGrow: 1, flexShrink: 1, height: "100%"}} onClick={onNext}>
            </div>
            <div className="song-elem-buttons">
                {
                    showAddToLibrary &&
                    <button className="player-button" onClick={onAddToLibrary} title="Add to library">
                        <MaterialIcon name="add"/>
                    </button>
                }
                {
                    hasYT &&
                    <button className="player-button" onClick={goToYT}>
                        <img src="yt_icon.png" width={20} height={20} alt="Go to Youtube"/>
                    </button>
                }
                <button className="player-button" onClick={onDelete} title="Remove from library">
                    <MaterialIcon name="delete"/>
                </button>
            </div>
        </div>
    )
})


export default Explorer;
