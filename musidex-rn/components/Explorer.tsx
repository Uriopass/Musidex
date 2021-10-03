import {Animated, FlatList, Image, StyleSheet, TouchableOpacity, View} from "react-native";
import React, {useCallback, useContext, useRef, useState} from "react";
import {Tag} from "../common/entity";
import {TextFg} from "./StyledText";
import Colors from "../domain/colors";
import API from "../common/api";
import Ctx from "../domain/ctx";
import {NextTrackCallback} from "../common/tracklist";
import {Icon} from "react-native-elements";
import {SortBy, useMusicSelect} from "../common/filters";

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

    return (
        <>
            {curTrack &&
            <SongElem musicID={curTrack} tags={metadata.getTags(curTrack) || new Map()} doNext={doNext} progress={1.0}
                      progressColor="#1d2f23"/>
            }
            <SongList musics={musics}/>
        </>
    )
};
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SongList(props: { musics: number[] }) {
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
                         tags={metadata.getTags(item) || new Map()}
                         doNext={doNext}
                         progress={tracklist.score_map.get(item)}
                         progressColor="#28222f"/>
    }, [metadata, doNext, tracklist, curTrack]);

    const onScroll = (ev: any) => {
        if (ev.nativeEvent.contentOffset.y <= 0.0) {
            Animated.timing(topOpacity, {
                toValue: 0.0,
                duration: 100,
                useNativeDriver: true
            }).start(() => setHidden(true));
        } else {
            Animated.timing(topOpacity, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true
            }).start();
            setHidden(false);
        }
    };
    const onGoToTop = () => {
        flatRef.current?.scrollToIndex({index: 0, animated: true});
    };

    return <>
        <FlatList data={props.musics}
                  ref={flatRef}
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
    </>
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
                        backgroundColor: props.progressColor
                    }]}/>
                )
            }
            <Image style={styles.itemImage} source={{uri: API.getAPIUrl() + "/storage/" + cover}}/>
            <View style={styles.trackInfo}>
                <TextFg>{title?.text}</TextFg>
                <TextFg>{artist?.text}</TextFg>
            </View>
        </TouchableOpacity>
    )
})

const styles = StyleSheet.create({
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
    }
})