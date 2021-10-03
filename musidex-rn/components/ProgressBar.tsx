import React from "react";

import {StyleSheet, Text, View,} from 'react-native';
import {timeFormat} from "../common/utils";
import Colors from "../domain/Colors";
import {Slider} from "react-native-elements";

type ProgressBarProps = {
    trackLength: number,
    currentPosition: number,
    onSeek: (pos: number) => void,
}

const ProgressBar = (props: ProgressBarProps) => {
    const elapsed = timeFormat(props.currentPosition);
    const remaining = timeFormat(props.trackLength - props.currentPosition);
    return (
        <View style={styles.container}>
            <View style={{flexDirection: 'row'}}>
                <Text style={[styles.text, {color: Colors.colorfg}]}>
                    {elapsed[0] + ":" + elapsed[1]}
                </Text>
                <View style={{flex: 1}}/>
                <Text style={[styles.text, {width: 40, color: Colors.colorfg}]}>
                    {props.trackLength > 1 && "-" + remaining[0] + ":" + remaining[1]}
                </Text>
            </View>
            <Slider
                maximumValue={Math.max(props.trackLength, 1, props.currentPosition + 1)}
                onSlidingComplete={props.onSeek}
                value={props.currentPosition}
                minimumTrackTintColor={Colors.bg}
                maximumTrackTintColor={Colors.fg}
                thumbTintColor={styles.thumb.backgroundColor}
                style={styles.track}
            />
        </View>
    );
};

export default ProgressBar;

const styles = StyleSheet.create({
    slider: {
        marginTop: -12,
    },
    container: {
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
    },
    track: {
        height: 2,
        borderRadius: 1,
    },
    thumb: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.fg,
    },
    text: {
        color: 'rgba(255, 255, 255, 0.72)',
        fontSize: 12,
        textAlign: 'center',
    }
});