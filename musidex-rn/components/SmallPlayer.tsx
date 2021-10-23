import React, {useContext} from "react";
import Ctx from "../domain/ctx";
import {Dimensions, Image, StyleSheet, TouchableOpacity, View, ViewStyle} from "react-native";
import {TextBg, TextFg, TextFgGray} from "./StyledText";
import {Icon} from "react-native-elements";
import API from "../common/api";
import {getTags} from "../common/entity";
import Thumbnail from "./Thumbnail";

interface PlayerProps {
    style: ViewStyle,
}

const SmallPlayer = (props: PlayerProps) => {
    const [metadata] = useContext(Ctx.Metadata);
    const [doNext, doPrev, reset] = useContext(Ctx.Controls);
    const [player, dispatch] = useContext(Ctx.Trackplayer);
    const list = useContext(Ctx.Tracklist);
    const syncState = useContext(Ctx.SyncState);

    const curTrack = list.last_played[list.last_played.length - 1];
    const tags = getTags(metadata, curTrack);
    const title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "";
    const artist = (tags !== undefined) ? (tags.get("artist")?.text || "Unknown Artist") : "";

    const canPrev = list.last_played.length > 1;
    const canReset = list.last_played.length > 0;

    const onPlay = () => {
        if (player.current) {
            dispatch({action: "play", id: player.current});
            return;
        }
        setTimeout(() => doNext(), 0);
    };

    const onReset = () => {
        dispatch({action: "reset"});
        reset();
    }

    return (
        <View style={[styles.container, props.style]}>
            <View style={styles.currentTrack}>
                <Thumbnail tags={tags} local={syncState.downloaded_thumb.has(curTrack || -1)} />
                <View style={styles.currentTrackTitle}>
                    <TextFg numberOfLines={2}>{title}</TextFg>
                    <TextFgGray numberOfLines={1}>{artist}</TextFgGray>
                </View>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity onPress={onReset} disabled={!canReset}>
                    <Icon size={30}
                          color={canReset ? "white" : "gray"}
                          name="clear"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={doPrev} disabled={!canPrev}>
                    <Icon size={32}
                          color={canPrev ? "white" : "gray"}
                          name="skip-previous"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={onPlay}>
                    <Icon size={37}
                          color="white"
                          name={player.paused ? "play-circle-fill" : "pause"}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTimeout(() => doNext(), 0)}>
                    <Icon size={32}
                          color="white"
                          name="skip-next"/>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    currentTrack: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    currentTrackTitle: {
        padding: 5,
        flex: 1,
    },
    trackInfo: {},
    controls: {
        flexBasis: 140,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});

export default SmallPlayer;
