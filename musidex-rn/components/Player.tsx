import React, {useContext} from "react";
import {NextTrackCallback} from "../common/tracklist";
import {timeFormat, useUpdate} from "../common/utils";
import {MetadataCtx, TrackplayerCtx} from "../constants/Contexts";
import ProgressBar from "./ProgressBar";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import {TextFg} from "./StyledText";
import {Icon} from "react-native-elements";

interface PlayerProps {
    onVolumeChange: (volume: number) => void;
    doNext: NextTrackCallback;
    onPrev: () => void;
    canPrev: () => boolean;
}

const Player = (props: PlayerProps) => {
    let [trackplayer, dispatch] = useContext(TrackplayerCtx);
    let [metadata,] = useContext(MetadataCtx);
    let [, forceUpdate] = useUpdate();

    /*
    useEffect(() => {
        trackplayer.audio.addEventListener("timeupdate", forceUpdate);
        return () => trackplayer.audio.removeEventListener("timeupdate", forceUpdate);
    }, [forceUpdate, trackplayer.audio])
     */

    let tags = metadata.getTags(trackplayer.current);
    let curtime = 0;// todo
    let duration = trackplayer.duration || (tags?.get("duration")?.integer || 0);
    let trackProgress = duration > 0 ? curtime / duration : 0;
    let title = (tags !== undefined) ? (tags.get("title")?.text || "No Title") : "";
    let artist = tags?.get("artist")?.text || "";
    let thumbnail = tags?.get("compressed_thumbnail")?.text || (tags?.get("thumbnail")?.text || "");

    let trackBarOnMove = (p: number) => {
        dispatch({action: "setTime", time: p});
    }

    return (
        <View style={styles.player}>
            <View style={styles.currentTrack}>
                {
                    (thumbnail !== "") &&
                    <View style={styles.currentTrackThumbnail}>
                        <img src={"storage/" + thumbnail} alt="song cover"/>
                    </View>
                }
                <View style={styles.currentTrackTitle}>
                    <TextFg>{title}</TextFg>
                    <TextFg>{artist}</TextFg>
                </View>
            </View>
            <View style={styles.centralMenu}>
                <View style={styles.controls}>
                    <TouchableOpacity onPress={props.onPrev} disabled={!props.canPrev()}>
                        <Icon size={20}
                              name="skip_previous"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => props.doNext()} disabled={!props.canPrev()}>
                        <Icon size={20}
                              name="play"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => props.doNext()} disabled={!props.canPrev()}>
                        <Icon size={20}
                              name="skip_next"/>
                    </TouchableOpacity>
                </View>
                <View style={styles.trackBar}>
                    <TextFg>
                        {timeFormat(curtime)}
                    </TextFg>
                    <ProgressBar onSeek={trackBarOnMove} currentPosition={trackProgress} trackLength={duration}/>
                    <span className="player-track-info">
                        {timeFormat(duration)}
                    </span>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    player: {},
    currentTrack: {},
    currentTrackThumbnail: {},
    currentTrackTitle: {},
    trackInfo: {},
    centralMenu: {},
    controls: {},
    trackBar: {},
})

export default Player;