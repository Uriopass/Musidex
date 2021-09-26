import './explorer.css'
import API from "../common/api";
import React, {Fragment, useContext, useEffect, useMemo, useState} from "react";
import {PlayButton} from "../components/playbutton";
import {EditableText, MaterialIcon} from "../components/utils";
import {canPlay, Tag} from "../common/entity";
import {NextTrackCallback, TracklistCtx} from "../common/tracklist";
import TextInput from "../components/input";
import {PageProps} from "./navigator";
import Filters, {applyFilters} from "../common/filters";
import {MetadataCtx} from "../domain/metadata";
import {FiltersCtx} from "../App";
import {clamp, Setter} from "../common/utils";

export interface ExplorerProps extends PageProps {
    title?: string;
    doNext: NextTrackCallback;
    curUser?: number;
}

const fuseOptions = {
    includeScore: true,
    keys: ['title', 'artist'],
    threshold: 0.4,
}

type SortByKind = { kind: "similarity" } | { kind: "creation_time" } | { kind: "tag", value: string }
type SortBy = { kind: SortByKind, descending: boolean }

function sortby_kind_eq(a: SortByKind, b: SortByKind) {
    if (a.kind === "tag" && b.kind === "tag") {
        return a.value === b.value
    }
    return a.kind === b.kind
}

const Explorer = (props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [filters, setFilters] = useContext(FiltersCtx);
    const list = useContext(TracklistCtx);
    const [shown, setShown] = useState(40);
    const [searchQry, setSearchQry] = useState("");
    const [sortBy, setSortBy] = useState<SortBy>({kind: {kind: "similarity"}, descending: true})

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
        const tags = metadata.getTags(curTrack);
        if (tags !== undefined) {
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
    }
    const [Fuse, setFuse] = useState<any>(undefined);
    useEffect(() => {
        if (searchQry !== "" && Fuse === undefined) {
            import("fuse.js").then(fuse => {
                setFuse(fuse);
            })
        }
    }, [searchQry, Fuse]);

    const fuse = useMemo(() => {
        if (Fuse === undefined) {
            return undefined;
        }
        return new Fuse.default(metadata.fuse_document, fuseOptions)
    }, [metadata, Fuse]);

    const qryFilter = useMemo(() => {
        if (searchQry === "" || fuse === undefined) {
            return [];
        }
        return fuse.search(searchQry)
    }, [searchQry, fuse])

    let toShow: number[];
    if (searchQry !== "" && fuse !== undefined) {
        toShow = qryFilter.map((v: any) => v.item.id);
    } else {
        switch (sortBy.kind.kind) {
            case "similarity":
                toShow = list.best_tracks.slice();
                if (curTrack === undefined) {
                    toShow = metadata.musics.slice();
                    toShow.reverse();
                }
                break;
            case "creation_time":
                toShow = metadata.musics.slice();
                toShow.reverse();
                break;
            case "tag":
                let v = sortBy.kind.value;
                toShow = metadata.musics.slice();
                toShow.sort((a, b) => {
                    return (metadata.getTags(a)?.get(v)?.text || "").localeCompare(metadata.getTags(b)?.get(v)?.text || "")
                })
                break;
        }
        if (!sortBy.descending) {
            toShow.reverse();
        }
    }

    applyFilters(filters, toShow, metadata, props.curUser);

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
                        if (id === curTrack) {
                            return <Fragment key={id}/>;
                        }
                        const tags = metadata.getTags(id);
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
}

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

const SongElem = (props: SongElemProps) => {
    let cover = props.tags?.get("compressed_thumbnail")?.text || (props.tags?.get("thumbnail")?.text || "");

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
                    <EditableText text={title.text || ""}
                                  onRename={(v) => API.insertTag({...title, text: v})}/>
                </b>
                <br/>
                <span className="small gray-fg">
                    <EditableText text={artist.text || ""}
                                  onRename={(v) => API.insertTag({...artist, text: v})}/>
                </span>
            </div>
            <div className="song-elem-buttons">
                {
                    hasYT &&
                    <button className="player-button" onClick={goToYT}>
                        <img src="yt_icon.png" width={20} height={20} alt="Go to Youtube"/>
                    </button>
                }
                {
                    showAddToLibrary &&
                    <button className="player-button" onClick={onAddToLibrary} title="Add to library">
                        <MaterialIcon name="add"/>
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