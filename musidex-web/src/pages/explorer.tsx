import './explorer.css'
import API from "../common/api";
import React, {useCallback, useContext, useState} from "react";
import {EditableText, MaterialIcon} from "../components/utils";
import {getTags, Tag, User} from "../common/entity";
import {NextTrackCallback} from "../common/tracklist";
import TextInput from "../components/input";
import {PageProps} from "./navigator";
import Filters, {isSimilarity, SimilarityParams, SortBy, sortby_kind_eq, SortByKind} from "../common/filters";
import {MetadataCtx} from "../domain/metadata";
import {SearchFormCtx, SelectedMusicsCtx, TracklistCtx} from "../App";
import {clamp, timeFormat, useDebouncedEffect} from "../common/utils";
import noCoverImg from "../no_cover.jpg";
import {enableNoSleep} from "../index";
import AutoSizer from "react-virtualized-auto-sizer";
import {FixedSizeList as List} from 'react-window';

export interface ExplorerProps extends PageProps {
    title?: string;
    doNext: NextTrackCallback;
    curUser?: number;
}

const Explorer = React.memo((props: ExplorerProps) => {
    const [metadata, syncMetadata] = useContext(MetadataCtx);
    const [searchForm, setSearchForm] = useContext(SearchFormCtx);
    const toShow = useContext(SelectedMusicsCtx);
    const list = useContext(TracklistCtx);

    const setFilters = useCallback((f: Filters) => setSearchForm({
        ...searchForm,
        filters: f
    }), [setSearchForm, searchForm]);
    const setSortBy = useCallback((s: SortBy) => setSearchForm({...searchForm, sort: s}), [setSearchForm, searchForm]);
    const setSearchQry = useCallback((s: string) => setSearchForm({
        ...searchForm,
        filters: {...searchForm.filters, searchQry: s}
    }), [setSearchForm, searchForm]);
    const setSimilarityParam = useCallback((s: SimilarityParams) => setSearchForm({
        ...searchForm,
        similarityParams: s
    }), [setSearchForm, searchForm]);
    const [localTemp, setLocalTemp] = useState(searchForm.similarityParams.temperature * 100);

    const curTrack: number | undefined = list.last_played[list.last_played.length - 1];

    const colorCur = "#1d2f23";

    let isRegexpInvalid = false;
    try {
        if (searchForm.filters.searchQry.charAt(0) === "/") {
            new RegExp(searchForm.filters.searchQry.substr(1));
        }
    } catch (e) {
        isRegexpInvalid = e;
    }

    useDebouncedEffect(() => {
        if (searchForm.similarityParams.temperature !== localTemp / 100) {
            setSimilarityParam({temperature: localTemp / 100})
        }
    }, [searchForm, setSimilarityParam, localTemp], 50);

    return (
        <div className={"explorer color-fg" + (props.hidden ? " hidden" : "")}>
            <div className="explorer-search-form">
                <div className="explorer-search">
                    <TextInput value={searchForm.filters.searchQry} onChange={setSearchQry} name="Search"/>
                </div>
                <SortBySelect forced={(searchForm.filters.searchQry !== "") ? "Query match score" : undefined}
                              sortBy={searchForm.sort} setSortBy={setSortBy}
                              hasSimilarity={curTrack !== undefined}/>
                <FilterBySelect
                    users={metadata.users}
                    filters={searchForm.filters}
                    setFilters={setFilters}/>
                {isSimilarity(searchForm) && list.last_played.length > 0 &&
                <>
                    <div className="temperature-pick" title="Random amount">
                        {searchForm.sort.kind.kind === "similarity" &&
                        <div title="Lock music order based on latest manually selected music"
                             onClick={() => {
                                 list.last_manual_select = list.last_played[list.last_played.length - 1];
                                 setSortBy({...searchForm.sort, similKeepOrder: !searchForm.sort.similKeepOrder})
                             }}>

                            {searchForm.sort.similKeepOrder ?
                                <MaterialIcon name="lock" style={{paddingLeft: 1, color: "var(--primary)"}}/>
                                :
                                <MaterialIcon name="lock_open" style={{paddingLeft: 1}}/>}
                        </div>}
                        <MaterialIcon name="casino" style={{paddingLeft: 1}}/>
                        <input className="temperature-pick-range" type="range"
                               value={localTemp} min={0} max={100}
                               onChange={(v) => setLocalTemp(parseInt(v.currentTarget.value))}/>
                    </div>
                </>
                }
                {isRegexpInvalid &&
                <span>Regex is invalid: {"" + isRegexpInvalid}</span>}
            </div>
            <div className="explorer-musics">
                <AutoSizer>
                    {({height, width}) =>
                        <List height={height}
                              width={width}
                              itemCount={toShow.list.length}
                              itemSize={65}
                              overscanCount={10}
                        >
                            {({index, style}) => {
                                let id = toShow.list[index] || -1;
                                let tags = getTags(metadata, id);
                                if (tags === undefined) {
                                    tags = new Map();
                                }
                                let progress = toShow.scoremap.get(id);
                                let progressColor;
                                if (id === curTrack) {
                                    progress = 1.0;
                                    progressColor = colorCur;
                                }
                                return <div style={style}>
                                    <SongElem musicID={id}
                                              tags={tags}
                                              curUser={props.curUser}
                                              syncMetadata={syncMetadata}
                                              doNext={props.doNext}
                                              progress={progress}
                                              playable={metadata.playable.has(id)}
                                              progressColor={progressColor}
                                    />
                                </div>

                            }}
                        </List>
                    }
                </AutoSizer>
            </div>
        </div>
    )
})

type FilterBySelectProps = {
    filters: Filters,
    setFilters: (newv: Filters) => void,
    users: User[],
}

export const FilterBySelect = React.memo((props: FilterBySelectProps) => {
    let onMySongsChange = (x: any) => {
        const v = parseInt(x.target.value);
        props.setFilters({
            ...props.filters,
            user: isNaN(v) ? undefined : v,
        });
    };

    return <div className="sortfilter-select">
        <MaterialIcon name="filter_alt"/>
        <div className="filter-elem">
            <label className="filter-elem-label">
                <MaterialIcon name="person"/>
                <select onChange={onMySongsChange} value={props.filters.user}>
                    <option/>
                    {
                        props.users.map((v) => {
                            return <option key={v.id} value={v.id}>{v.name}</option>
                        })
                    }
                </select>
            </label>
        </div>
    </div>
})

type SortBySelectProps = {
    forced?: string;
    sortBy: SortBy,
    setSortBy: (v: SortBy) => void,
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
            <MaterialIcon name="sort"/>
            <span className="sort-by-forced">
                {props.forced}
            </span>
        </div>;
    }

    return <div className="sortfilter-select">
        <MaterialIcon name="sort"/>
        {props.hasSimilarity &&
        <SortByElem sort={{kind: "similarity"}} name="Similarity"/>
        }
        <SortByElem sort={{kind: "tag", value: "title"}} name="Title"/>
        <SortByElem sort={{kind: "creation_time"}} name="Last added"/>
        <SortByElem sort={{kind: "random"}} name="Random"/>
    </div>;
})

type ThumbnailProps = {
    playable?: boolean,
    setHovered?: (hov: boolean) => void,
    onClick?: () => void,
    cover?: string,
}

export const Thumbnail = (props: ThumbnailProps) => {
    return <div className={`cover-image-container ${props.playable ? "song-elem-playable" : ""}`}
                onClick={props.onClick}
                onMouseEnter={() => props.setHovered?.(true)} onMouseLeave={() => props.setHovered?.(false)}>
        {
            (props.cover) ?
                <img src={"storage/" + props.cover} alt="album or video cover" loading="lazy"/> :
                <img src={noCoverImg} alt="album or video cover"/>
        }
    </div>
}


type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
    doNext: NextTrackCallback;
    syncMetadata: () => void;
    progress?: number,
    progressColor?: string;
    curUser?: number;
    playable: boolean;
}

export const SongElem = React.memo((props: SongElemProps) => {
    let cover = props.tags?.get("compressed_thumbnail")?.text || props.tags?.get("thumbnail")?.text;

    const hasYT = props.tags.get("youtube_video_id")?.text;
    const goToYT = () => {
        window.open("https://youtube.com/watch?v=" + hasYT, "_blank")?.focus();
    };

    const [hovered, setHovered] = useState(false);
    let c = props.progressColor;
    if (c === undefined) {
        c = "#28222f";
    }
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
    const duration = props.tags.get("duration")?.integer;

    const onNext = () => {
        if (!props.playable) {
            return;
        }
        props.doNext(props.musicID);
        enableNoSleep();
    }

    return (
        <div
            className={`song-elem ${props.playable ? "" : "song-elem-disabled"} ${(hovered && props.playable) ? "song-elem-hovered" : ""}`}
            style={{background: grad}}>
            <Thumbnail playable={props.playable} onClick={onNext} setHovered={setHovered} cover={cover}/>
            <div style={{paddingLeft: "10px"}}>
                <b>
                    <EditableText text={title.text || ""}
                                  onRename={(v) => API.insertTag({...title, text: v})}/>
                </b>
                <br/>
                <span className="small gray-fg">
                    <EditableText text={artist.text || ""}
                                  onRename={(v) => API.insertTag({...artist, text: v})}/>
                    {duration && " • " + timeFormat(duration)}
                </span>
            </div>
            <div className={`${props.playable ? "song-elem-playable" : ""}`}
                 style={{flexBasis: 0, flexGrow: 1, flexShrink: 1, height: "100%", minHeight: 60}} onClick={onNext}
                 onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
