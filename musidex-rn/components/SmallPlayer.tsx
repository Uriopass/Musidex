import React, {useContext} from "react";
import {TracklistCtx} from "../common/tracklist";
import {ControlsCtx, MetadataCtx, TrackplayerCtx} from "../constants/Contexts";
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
    const [player, dispatch] = useContext(TrackplayerCtx);
    const list = useContext(TracklistCtx);

    const tags = metadata.getTags(list.last_played[list.last_played.length - 1]);
    const title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "";
    const artist = tags?.get("artist")?.text || "";
    const thumbnail = tags?.get("compressed_thumbnail")?.text || (tags?.get("thumbnail")?.text || "");

    const canPrev = list.last_played.length > 1;

    const onPlay = () => {
        if (player.current) {
            dispatch({action: "play", id: player.current});
            return;
        }
        setTimeout(() => doNext(), 0);
    };

    return (
        <View style={[styles.container, props.style]}>
            <View style={styles.currentTrack}>
                {
                    (thumbnail !== "") &&
                    <Image style={styles.currentTrackThumbnail}
                           source={{uri: API.getAPIUrl() + "/storage/" + thumbnail}} width={60} height={60}/>
                }
                <View style={styles.currentTrackTitle}>
                    <TextFg>{title}</TextFg>
                    <TextFg>{artist}</TextFg>
                </View>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity onPress={doPrev} disabled={!canPrev}>
                    <Icon size={35}
                          color={canPrev ? "white" : "gray"}
                          name="skip-previous"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={onPlay}>
                    <Icon size={40}
                          color="white"
                          name={player.paused ? "play-circle-fill" : "pause"}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTimeout(() => doNext(), 0)}>
                    <Icon size={35}
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
        flexDirection: "row",
        flexBasis: 200,
        alignItems: "center",
    },
    currentTrackThumbnail: {
        width: 60,
        height: 60,
    },
    currentTrackTitle: {
        padding: 5,
    },
    trackInfo: {},
    controls: {
        flexBasis: 110,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
})

export default SmallPlayer;