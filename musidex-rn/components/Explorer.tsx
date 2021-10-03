import {Animated, FlatList, Image, StyleSheet, TouchableOpacity, View} from "react-native";
import React, {useCallback, useContext, useRef, useState} from "react";
import {Tag} from "../common/entity";
import {TextFg} from "./StyledText";
import Colors from "../domain/Colors";
import API from "../common/api";
import {ControlsCtx, MetadataCtx} from "../domain/contexts";
import {NextTrackCallback} from "../common/tracklist";
import {Icon} from "react-native-elements";


export default function Explorer() {
    const [metadata] = useContext(MetadataCtx);

    return (
        <SongList musics={metadata.musics}/>
    )
};
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SongList(props: {musics: number[]}) {
    const [metadata] = useContext(MetadataCtx);
    const [doNext] = useContext(ControlsCtx);

    const flatRef = useRef<FlatList>(null);
    const topOpacity = useRef(new Animated.Value(0)).current;
    const [hidden, setHidden] = useState(true);

    const renderSong = useCallback(({item}: { item: number }) => {
        return <SongElem musicID={item} tags={metadata.getTags(item) || new Map()} doNext={doNext}/>
    }, [metadata]);

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
}

const SongElem = (props: SongElemProps) => {
    const cover = props.tags?.get("compressed_thumbnail")?.text || (props.tags?.get("thumbnail")?.text || "");

    const title = props.tags.get("title") || {music_id: props.musicID, key: "title", text: "No Title"};
    const artist = props.tags.get("artist") || {music_id: props.musicID, key: "artist", text: "Unknown Artist"};

    return (
        <TouchableOpacity style={styles.item} onPress={() => props.doNext(props.musicID)}>
            <Image style={styles.itemImage} source={{uri: API.getAPIUrl() + "/storage/" + cover}}/>
            <View style={styles.trackInfo}>
                <TextFg>{title?.text}</TextFg>
                <TextFg>{artist?.text}</TextFg>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
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