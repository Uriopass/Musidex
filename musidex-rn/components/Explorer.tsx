import {Animated, FlatList, Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import React, {useCallback, useContext, useRef, useState} from "react";
import {getTags, Tag} from "../common/entity";
import {TextBg, TextFg, TextPrimary, TextSecondary} from "./StyledText";
import Colors from "../domain/colors";
import API from "../common/api";
import Ctx from "../domain/ctx";
import {NextTrackCallback} from "../common/tracklist";
import {Icon} from "react-native-elements";
import {SortBy, sortby_kind_eq, SortByKind, useMusicSelect} from "../common/filters";
import {SearchInput} from "./SearchInput";
import {Setter} from "../common/utils";

export default function Explorer() {
    const [metadata] = useContext(Ctx.Metadata);
    const tracklist = useContext(Ctx.Tracklist);
    const [doNext] = useContext(Ctx.Controls);
    const [filters, setFilters] = useContext(Ctx.Filters);
    const [user] = useContext(Ctx.User);
    const [searchQry, setSearchQry] = useState("");
    const [sortBy, setSortBy] = useState({kind: {kind: "similarity"}, descending: true} as SortBy);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];
    const musics = useMusicSelect(metadata, searchQry, sortBy, tracklist, filters, user);

    const TopComp = <>
        <SearchInput value={searchQry} onChangeText={(text => setSearchQry(text))}
                     placeholderTextColor={Colors.colorbg}/>
        {curTrack &&
        <SongElem musicID={curTrack} tags={getTags(metadata, curTrack) || new Map()} doNext={doNext} progress={1.0}
                  progressColor="#1d2f23"/>
        }
        <SortBySelect forced={(searchQry !== "") ? "Query match score" : undefined}
                      sortBy={sortBy} setSortBy={setSortBy}
                      hasSimilarity={curTrack !== undefined}/>
    </>

    return (
        <SongList musics={musics} topComp={TopComp}/>
    );
};


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
            <TextBg>Sort By:</TextBg>
            <TextSecondary style={styles.sortByElem}>{props.forced}</TextSecondary>
        </View>;
    }

    return <View style={styles.sortFilterSelect}>
        <TextBg>Sort By:</TextBg>
        {props.hasSimilarity &&
        <SortByElem sort={{kind: "similarity"}} name="Similarity"/>
        }
        <SortByElem sort={{kind: "tag", value: "title"}} name="Title"/>
        <SortByElem sort={{kind: "creation_time"}} name="Last added"/>
    </View>;
})


const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SongList(props: {
    musics: number[],
    topComp: any,
}) {
    const [metadata] = useContext(Ctx.Metadata);
    const [doNext] = useContext(Ctx.Controls);
    const tracklist = useContext(Ctx.Tracklist);

    const flatRef = useRef<FlatList>(null);
    const topOpacity = useRef(new Animated.Value(0)).current;
    const [hidden, setHidden] = useState(true);

    const curTrack: number | undefined = tracklist.last_played[tracklist.last_played.length - 1];

    const renderSong = useCallback(({item}: { item: number }) => {
        if (item === curTrack) {
            return <></>;
        }
        return <SongElem musicID={item}
                         tags={getTags(metadata, item) || new Map()}
                         doNext={doNext}
                         progress={tracklist.score_map.get(item)}
                         progressColor="#28222f"/>;
    }, [metadata, doNext, tracklist, curTrack]);

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
                <TextFg>{artist?.text}</TextFg>
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
