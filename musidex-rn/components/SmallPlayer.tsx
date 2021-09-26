import React, {useContext} from "react";
import {TracklistCtx} from "../common/tracklist";
import {ControlsCtx, MetadataCtx} from "../constants/Contexts";
import {Image, StyleSheet, TouchableOpacity, View, ViewStyle} from "react-native";
import {TextFg} from "./StyledText";
import {Icon} from "react-native-elements";
import API from "../common/api";

interface PlayerProps {
    style: ViewStyle,
}

const SmallPlayer = (props: PlayerProps) => {
    const [metadata,] = useContext(MetadataCtx);
    const [doNext, doPrev] = useContext(ControlsCtx);
    const list = useContext(TracklistCtx);

    const tags = metadata.getTags(list.last_played[list.last_played.length - 1]);
    const title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "No Title";
    const artist = tags?.get("artist")?.text || "No Artist";
    const thumbnail = tags?.get("compressed_thumbnail")?.text || (tags?.get("thumbnail")?.text || "");

    const canPrev = list.last_played.length > 1;

    return (
        <View style={[styles.container, props.style]}>
            <View style={styles.currentTrack}>
                {
                    (thumbnail !== "") &&
                    <View style={styles.currentTrackThumbnail}>
                        <Image source={{uri: API.getAPIUrl() + "/storage/" + thumbnail}}/>
                    </View>
                }
                <View style={styles.currentTrackTitle}>
                    <TextFg>{title}</TextFg>
                    <TextFg>{artist}</TextFg>
                </View>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity onPress={doPrev} disabled={!canPrev}>
                    <Icon size={50}
                          color={canPrev ? "white" : "gray"}
                          name="skip-previous"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => doNext()}>
                    <Icon size={50}
                          color="white"
                          name="play-arrow"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => doNext()}>
                    <Icon size={50}
                          color="white"
                          name="skip-next"/>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    currentTrack: {
        flexBasis: 200,
    },
    currentTrackThumbnail: {},
    currentTrackTitle: {},
    trackInfo: {},
    controls: {
        flexBasis: 150,
        flexDirection: "row",
    },
})

export default SmallPlayer;