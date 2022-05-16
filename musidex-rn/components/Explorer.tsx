import {
    ActivityIndicator,
    Animated,
    FlatList,
    StyleSheet,
    TouchableHighlight,
    TouchableOpacity,
    View
} from "react-native";
import React, {useCallback, useContext, useMemo, useRef, useState} from "react";
import {getTags, Tag} from "../common/entity";
import {TextBg, TextFg, TextFgGray, TextPrimary, TextSecondary} from "./StyledText";
import Colors from "../domain/colors";
import Ctx from "../domain/ctx";
import {NextTrackCallback} from "../common/tracklist";
import Slider from "@react-native-community/slider";
import {isSimilarity, MusicSelect, SortBy, sortby_kind_eq, SortByKind} from "../common/filters";
import {Checkbox, SearchInput} from "./Input";
import Filters, {SimilarityParams} from "../../musidex-web/src/common/filters";
import Thumbnail from "./Thumbnail";
import {isMusicSynced, isThumbSynced} from "../domain/sync";
import {Icon} from "react-native-elements";
import {timeFormat} from "../common/utils";
import {SwipeListView} from "react-native-swipe-list-view";
import API from "../common/api";

export default function Explorer() {
    const [user] = useContext(Ctx.User);
    const tracklist = useContext(Ctx.Tracklist);
    const [searchForm, setSearchForm] = useContext(Ctx.SearchForm);
    const toShow = useContext(Ctx.SelectedMusics);

    const setSortBy = useCallback((s: SortBy) => setSearchForm({...searchForm, sort: s}), [setSearchForm, searchForm]);
    const setSearchQry = useCallback((s: string) => setSearchForm({
        ...searchForm,
        filters: {...searchForm.filters, searchQry: s},
    }), [setSearchForm, searchForm]);

    const setFilters = useCallback((f) => setSearchForm({...searchForm, filters: f}), [setSearchForm, searchForm]);
    const setSimilarityParam = useCallback((s: SimilarityParams) => setSearchForm({
        ...searchForm,
        similarityParams: s,
    }), [setSearchForm, searchForm]);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];
    const vChange = useCallback((value) => {
        setSimilarityParam({temperature: value / 100});
    }, [setSimilarityParam]);

    const firstV = useMemo(() => searchForm.similarityParams.temperature * 100, []);

    const TopComp = <>
        <SearchInput value={searchForm.filters.searchQry} onChangeText={(text => setSearchQry(text))}/>
        <SortBySelect forced={(searchForm.filters.searchQry !== "") ? "Query match score" : undefined}
                      sortBy={searchForm.sort} setSortBy={setSortBy}
                      hasSimilarity={curTrack !== undefined}/>
        <FilterBySelect user={user} filters={searchForm.filters} setFilters={setFilters}/>
        {isSimilarity(searchForm) &&
            <View style={styles.temperatureView}>
                <Icon style={styles.temperatureIcon} color={Colors.colorbg} size={20} name="casino"/>
                <Slider style={styles.temperatureSlider}
                        minimumTrackTintColor={Colors.primary}
                        thumbTintColor={Colors.colorfg}
                        tapToSeek={true}
                        maximumTrackTintColor={Colors.colorbg}
                        value={firstV} minimumValue={0} maximumValue={100}
                        onValueChange={vChange}/>
            </View>}
    </>;

    return (
        <SongList musics={toShow} topComp={TopComp}/>
    );
}


type SortBySelectProps = {
    forced?: string;
    sortBy: SortBy,
    setSortBy: (v: SortBy) => void,
    hasSimilarity: boolean,
}

const SortBySelect = React.memo((props: SortBySelectProps) => {
    let SortByElem = (props2: { sort: SortByKind, name: string }) => {
        let is_same = sortby_kind_eq(props.sortBy.kind, props2.sort);
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
        </TouchableOpacity>;
    };

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
        <SortByElem sort={{kind: "random"}} name="Random"/>
    </View>;
});

type FilterBySelectProps = {
    user: number | undefined,
    filters: Filters,
    setFilters: (newv: Filters) => void,
}

const FilterBySelect = React.memo((props: FilterBySelectProps) => {
    let onMySongsChange = (v: boolean) => {
        props.setFilters({
            ...props.filters,
            user: v ? props.user : undefined,
        });
    };

    return <View style={styles.sortFilterSelect}>
        <Icon size={20} name="filter-alt" color={Colors.colorbg}/>
        <View style={styles.sortByElem}>
            <Checkbox
                checked={props.filters.user !== undefined}
                onChange={onMySongsChange}>
                <TextBg> My Songs</TextBg>
            </Checkbox>
        </View>
    </View>;
});


const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const hiddenOpacity = new Animated.Value(0);
let prevRow: string;

function SongList(props: {
    musics: MusicSelect,
    topComp: any,
}) {
    const [metadata, fetchMetadata] = useContext(Ctx.Metadata);
    const [doNext] = useContext(Ctx.Controls);
    const tracklist = useContext(Ctx.Tracklist);
    const [searchForm] = useContext(Ctx.SearchForm);
    const syncState = useContext(Ctx.SyncState);

    const [refreshing, setRefreshing] = useState(false);

    let flatRef = useRef<FlatList>(null);
    const topOpacity = useRef(new Animated.Value(0)).current;
    const [hidden, setHidden] = useState(true);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];

    const renderSong = useCallback(({item}: { item: number }) => {
        let color = "#28222f";
        let progress = props.musics.scoremap.get(item);
        if (item === curTrack) {
            color = "#1d2f23";
            progress = 1.0;
        }
        return <SongElem musicID={item}
                         isSynced={isMusicSynced(syncState, metadata, item)}
                         thumbSynced={isThumbSynced(syncState, metadata, item)}
                         tags={getTags(metadata, item) || new Map()}
                         doNext={doNext}
                         progress={progress}
                         progressColor={color}/>;
    }, [metadata, doNext, tracklist, curTrack, searchForm.sort.kind.kind, searchForm.filters.searchQry]);

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

    const objRef = useRef();

    return <>
        <SwipeListView
            ref={objRef}
            useFlatList={true}
            data={props.musics.list}
            refreshing={refreshing}
            onRefresh={() => {
                setRefreshing(true);
                fetchMetadata().then(() => setRefreshing(false));
            }}
            keyboardShouldPersistTaps={"handled"}
            listViewRef={(view: any) => flatRef.current = view}
            renderHiddenItem={(rowData, rowMap) => {
                return <SongElemHiddenItem userID={searchForm.filters.user || -1} musicID={rowData.item} fetchMetadata={fetchMetadata}/>;
            }}
            renderItem={renderSong}
            ListHeaderComponent={props.topComp}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            disableRightSwipe={true}
            rightOpenValue={-50}
            stopRightSwipe={-50}
            maxToRenderPerBatch={5}
            directionalDistanceChangeThreshold={10}
            initialNumToRender={10}
            windowSize={5}
            onRowOpen={(rowKey) => {
                hiddenOpacity.setValue(1);
                prevRow = rowKey;
            }}
            onRowClose={(_, rowMap) => {
                hiddenOpacity.setValue(0);
                if (prevRow) {
                    let cpy = prevRow;
                    prevRow = "";
                    rowMap[cpy]?.closeRow();
                }
            }}
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

type SongElemHiddenItemProps = {
    musicID: number;
    userID: number;
    fetchMetadata: () => void;
};

const SongElemHiddenItem = (props: SongElemHiddenItemProps) => {
    let [loading, setLoading] = useState(false);
    return <TouchableOpacity activeOpacity={0.2}
                             style={styles.hiddenItem}
                             onPress={() => {
                                 setLoading(true);
                                 API.deleteMusicUser(props.musicID, props.userID).then(() => props.fetchMetadata());
                             }}>
        <Animated.View style={{
            paddingHorizontal: 10,
            width: 50,
            display: "flex",
            height: "100%",
            justifyContent: "center",
            backgroundColor: "#bb4c4c",
            opacity: hiddenOpacity
        }}>
            {loading ? <ActivityIndicator/> : <Icon name="remove-circle"/>}
        </Animated.View>
    </TouchableOpacity>;
};

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
    doNext: NextTrackCallback;
    progress: number | undefined;
    progressColor: string;
    isSynced: boolean;
    thumbSynced: boolean;
}

const SongElem = React.memo(React.forwardRef((props: SongElemProps, ref) => {
    const title = props.tags.get("title") || {music_id: props.musicID, key: "title", text: "No Title"};
    const artist = props.tags.get("artist");
    const duration = props.tags.get("duration")?.integer;

    return (
        <TouchableOpacity activeOpacity={0.5} style={styles.item} onPress={() => props.doNext(props.musicID)}>
            {
                props.progress !== undefined &&
                (
                    <View style={[styles.progress, {
                        width: (props.progress * 100) + "%",
                        backgroundColor: props.progressColor,
                    }]}/>
                )
            }
            <View style={styles.startElems}>
                <Thumbnail tags={props.tags} local={props.thumbSynced}/>
                <View style={styles.trackInfo}>
                    <TextFg numberOfLines={2}>{title?.text} </TextFg>
                    <TextFgGray
                        numberOfLines={1}>{artist?.text} {duration && ("• " + timeFormat(duration))}</TextFgGray>
                </View>
            </View>
            <View style={styles.trackIcons}>
                {props.isSynced &&
                    <Icon name="cloud-done" color={Colors.colorbg} size={11}/>
                }
            </View>
        </TouchableOpacity>
    );
}));

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
        paddingLeft: 10,
        justifyContent: "center",
        flexShrink: 1,
    },
    trackIcons: {
        flexBasis: 20,
        alignSelf: "center",
        justifyContent: "center",
    },
    startElems: {
        flexDirection: "row",
        flexShrink: 1,
    },
    temperatureView: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    temperatureIcon: {
        paddingLeft: 10,
    },
    temperatureSlider: {
        flexGrow: 1,
        paddingHorizontal: 10,
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
        justifyContent: "space-between",
        marginVertical: 4,
        marginHorizontal: 5,
        borderRadius: 5,
        overflow: "hidden",
    },
    hiddenItem: {
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        borderRadius: 5,
        marginVertical: 4,
        marginHorizontal: 5,
        height: 60,
        overflow: "hidden",
    },
    musiclist: {
        position: "relative",
        flexBasis: 100,
        flexGrow: 1,
    },
});
