import {FlatList, Image, Pressable, SafeAreaView, StyleSheet, TouchableOpacity, View} from "react-native";
import React, {useCallback, useContext} from "react";
import {Tag} from "../common/entity";
import {TextFg} from "./StyledText";
import Colors from "../constants/Colors";
import API from "../common/api";
import {ControlsCtx, MetadataCtx} from "../constants/Contexts";
import SmallPlayer from "./SmallPlayer";
import {NextTrackCallback} from "../common/tracklist";

export default function Explorer() {
    const [metadata] = useContext(MetadataCtx);
    const [doNext] = useContext(ControlsCtx);

    const renderSong = useCallback(({item}: { item: number }) => {
        return <SongElem musicID={item} tags={metadata.getTags(item) || new Map()} doNext={doNext}/>
    }, [metadata]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList data={metadata.musics}
                      renderItem={renderSong}
                      keyExtractor={(item) => item.toString()}
                      style={styles.musiclist}/>
            <SmallPlayer style={styles.player}/>
        </SafeAreaView>
    )
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
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    player: {
        flexBasis: 60,
        flexGrow: 0,
    },
    trackInfo: {
        padding: 10,
    },
    itemImage: {
        width: 60,
        height: 60,
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
        flexBasis: 100,
        flexGrow: 1,
    }
})