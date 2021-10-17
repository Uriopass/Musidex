import {Animated, FlatList, Image, StyleSheet, TouchableOpacity, View} from "react-native";
import React, {useCallback, useContext, useRef, useState} from "react";
import {getTags, Tag} from "../common/entity";
import {TextBg, TextFg, TextFgGray, TextPrimary, TextSecondary} from "./StyledText";
import Colors from "../domain/colors";
import API from "../common/api";
import Ctx from "../domain/ctx";
import {NextTrackCallback} from "../common/tracklist";
import {Icon} from "react-native-elements";
import {SortBy, sortby_kind_eq, SortByKind} from "../common/filters";
import {Checkbox, SearchInput} from "./Input";
import Filters from "../../musidex-web/src/common/filters";

export default function Explorer() {
    const [metadata] = useContext(Ctx.Metadata);
    const tracklist = useContext(Ctx.Tracklist);
    const [doNext] = useContext(Ctx.Controls);
    const [searchForm, setSearchForm] = useContext(Ctx.SearchForm);
    const toShow = useContext(Ctx.SelectedMusics);

    //const setFilters = useCallback((f: Filters) => setSearchForm({...searchForm, filters: f}), [setSearchForm, searchForm]);
    const setSortBy = useCallback((s: SortBy) => setSearchForm({...searchForm, sort: s}), [setSearchForm, searchForm]);
    const setSearchQry = useCallback((s: string) => setSearchForm({
        ...searchForm,
        filters: {...searchForm.filters, searchQry: s}
    }), [setSearchForm, searchForm]);

    const setFilters = useCallback((f) => setSearchForm({...searchForm, filters: f}), [setSearchForm, searchForm]);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];
    const TopComp = <>
        <SearchInput value={searchForm.filters.searchQry} onChangeText={(text => setSearchQry(text))}/>
        <SortBySelect forced={(searchForm.filters.searchQry !== "") ? "Query match score" : undefined}
                      sortBy={searchForm.sort} setSortBy={setSortBy}
                      hasSimilarity={curTrack !== undefined}/>
        <FilterBySelect filters={searchForm.filters} setFilters={setFilters}/>
        {(curTrack && searchForm.sort.kind.kind === "similarity") &&
        <SongElem musicID={curTrack} tags={getTags(metadata, curTrack) || new Map()} doNext={doNext} progress={1.0}
                  progressColor="#1d2f23"/>
        }
    </>

    return (
        <SongList musics={toShow} topComp={TopComp}/>
    );
};


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
        };

        return <TouchableOpacity style={[styles.sortByElem]}
                                 activeOpacity={0.7}
                                 onPress={on_click}>
            {
                is_same ? <TextPrimary>{props2.name}</TextPrimary> : <TextBg>{props2.name}</TextBg>

            }
            {
                (is_same) &&
                (
                    props.sortBy.descending ?
                        <Icon name="south" size={18} color={Colors.primary}/> :
                        <Icon name="north" size={18} color={Colors.primary}/>
                )
            }
        </TouchableOpacity>
    }

    if (props.forced !== undefined) {
        return <View style={styles.sortFilterSelect}>
            <Icon size={20} name="sort" color={Colors.colorbg}/>
            <TextSecondary style={styles.sortByElem}>{props.forced}</TextSecondary>
        </View>;
    }

    return <View style={styles.sortFilterSelect}>
        <Icon size={20} name="sort" color={Colors.colorbg}/>
        {props.hasSimilarity &&
        <SortByElem sort={{kind: "similarity"}} name="Similarity"/>
        }
        <SortByElem sort={{kind: "tag", value: "title"}} name="Title"/>
        <SortByElem sort={{kind: "creation_time"}} name="Last added"/>
    </View>;
})

type FilterBySelectProps = {
    filters: Filters,
    setFilters: (newv: Filters) => void,
}

const FilterBySelect = React.memo((props: FilterBySelectProps) => {
    let onMySongsChange = (v: boolean) => {
        props.setFilters({
            ...props.filters,
            user_only: v,
        });
    };

    return <View style={styles.sortFilterSelect}>
        <Icon size={20} name="filter-alt" color={Colors.colorbg}/>
        <View style={styles.sortByElem}>
            <Checkbox
                checked={props.filters.user_only}
                onChange={onMySongsChange}>
                <TextBg> My Songs</TextBg>
            </Checkbox>
        </View>
    </View>
})


const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SongList(props: {
    musics: number[],
    topComp: any,
}) {
    const [metadata] = useContext(Ctx.Metadata);
    const [doNext] = useContext(Ctx.Controls);
    const tracklist = useContext(Ctx.Tracklist);
    const [searchForm] = useContext(Ctx.SearchForm);

    const flatRef = useRef<FlatList>(null);
    const topOpacity = useRef(new Animated.Value(0)).current;
    const [hidden, setHidden] = useState(true);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];

    const renderSong = useCallback(({item}: { item: number }) => {
        let color = "#28222f";
        let progress = tracklist.score_map.get(item);
        if (item === curTrack) {
            if (searchForm.sort.kind.kind === "similarity") {
                return <></>;
            }
            color = "#1d2f23";
            progress = 1.0;
        }
        return <SongElem musicID={item}
                         tags={getTags(metadata, item) || new Map()}
                         doNext={doNext}
                         progress={progress}
                         progressColor={color}/>;
    }, [metadata, doNext, tracklist, curTrack, searchForm.sort.kind.kind]);

    const onScroll = (ev: any) => {
        if (ev.nativeEvent.contentOffset.y <= 0.0) {
            Animated.timing(topOpacity, {
                toValue: 0.0,
                duration: 100,
                useNativeDriver: true,
            }).start(() => setHidden(true));
        } else {
            Animated.timing(topOpacity, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }).start();
            setHidden(false);
        }
    };
    const onGoToTop = () => {
        flatRef.current?.scrollToOffset({offset: 0, animated: true});
    };

    return <>
        <FlatList data={props.musics}
                  keyboardShouldPersistTaps={"handled"}
                  ref={flatRef}
                  ListHeaderComponent={props.topComp}
                  showsVerticalScrollIndicator={false}
                  renderItem={renderSong}
                  onScroll={onScroll}
                  maxToRenderPerBatch={5}
                  initialNumToRender={10}
                  windowSize={5}
                  keyExtractor={(item) => item.toString()}
                  style={styles.musiclist}/>
        {!hidden &&
        <AnimatedTouchable
            style={[styles.arrowUp, {opacity: topOpacity}]}
            onPress={onGoToTop}>
            <Icon size={20} name="arrow-upward" color="black"/>
        </AnimatedTouchable>
        }
    </>;
}


type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
    doNext: NextTrackCallback;
    progress: number | undefined;
    progressColor: string;
}

const SongElem = React.memo((props: SongElemProps) => {
    const cover = props.tags?.get("compressed_thumbnail")?.text || (props.tags?.get("thumbnail")?.text || "");

    const title = props.tags.get("title") || {music_id: props.musicID, key: "title", text: "No Title"};
    const artist = props.tags.get("artist") || {music_id: props.musicID, key: "artist", text: "Unknown Artist"};

    return (
        <TouchableOpacity style={styles.item} onPress={() => props.doNext(props.musicID)}>
            {
                props.progress !== undefined &&
                (
                    <View style={[styles.progress, {
                        width: (props.progress * 100) + "%",
                        backgroundColor: props.progressColor,
                    }]}/>
                )
            }
            <Image style={styles.itemImage} source={{uri: API.getAPIUrl() + "/storage/" + cover}}/>
            <View style={styles.trackInfo}>
                <TextFg>{title?.text}</TextFg>
                <TextFgGray>{artist?.text}</TextFgGray>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    sortFilterSelect: {
        flexDirection: "row",
        padding: 10,
    },
    sortByElem: {
        paddingHorizontal: 7,
        flexDirection: "row",
    },
    progress: {
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
    },
    trackInfo: {
        padding: 10,
    },
    itemImage: {
        width: 60,
        height: 60,
    },
    arrowUp: {
        padding: 7,
        position: "absolute",
        top: 50,
        alignSelf: "center",
        backgroundColor: Colors.primary,
        borderRadius: 50,
    },
    item: {
        position: "relative",
        backgroundColor: Colors.fg,
        display: "flex",
        flexDirection: "row",
        marginVertical: 4,
        marginHorizontal: 5,
        borderRadius: 5,
        overflow: "hidden",
    },
    musiclist: {
        position: "relative",
        flexBasis: 100,
        flexGrow: 1,
    },
});
