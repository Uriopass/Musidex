import React, {useContext} from "react";
import {TracklistCtx} from "../common/tracklist";
import {timeFormat, useUpdate} from "../common/utils";
import {ControlsCtx, MetadataCtx, TrackplayerCtx} from "../constants/Contexts";
import {StyleSheet, TouchableOpacity, View, ViewStyle} from "react-native";
import {TextFg} from "./StyledText";
import {Icon} from "react-native-elements";

interface PlayerProps {
    style: ViewStyle,
}

const SmallPlayer = (props: PlayerProps) => {
    const [trackplayer, dispatch] = useContext(TrackplayerCtx);
    const [metadata,] = useContext(MetadataCtx);
    const [doNext, doPrev] = useContext(ControlsCtx);
    const list = useContext(TracklistCtx);

    let [, forceUpdate] = useUpdate();

    /*
    useEffect(() => {
        trackplayer.audio.addEventListener("timeupdate", forceUpdate);
        return () => trackplayer.audio.removeEventListener("timeupdate", forceUpdate);
    }, [forceUpdate, trackplayer.audio])
     */

    const tags = metadata.getTags(trackplayer.current);
    const curtime = 0;// todo
    const duration = trackplayer.duration || (tags?.get("duration")?.integer || 0);
    const trackProgress = duration > 0 ? curtime / duration : 0;
    const title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "No Title";
    const artist = tags?.get("artist")?.text || "No Artist";
    const thumbnail = tags?.get("compressed_thumbnail")?.text || (tags?.get("thumbnail")?.text || "");

    let trackBarOnMove = (p: number) => {
        dispatch({action: "setTime", time: p});
    }

    const canPrev = list.last_played.length > 1;

    console.log("lol", props.style);

    return (
        <View style={[styles.container, props.style]}>
            <View style={styles.currentTrack}>
                {
                    (thumbnail !== "") &&
                    <View style={styles.currentTrackThumbnail}>
                        {/*<Image src={"storage/" + thumbnail} alt="song cover"/>*/}
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
                          color={canPrev?"white":"gray"}
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