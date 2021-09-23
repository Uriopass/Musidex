import * as React from 'react';
import {useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';

import {Text, View} from 'react-native';

import API from "../common/api";
import useStored from "../hooks/useStored";
import {emptyMetadata, MusidexMetadata} from "../common/entity";
import Colors from "../constants/Colors";
import {TextFg} from "../components/StyledText";

export default function MainScreen() {
    let [metadata, setMetadata] = useStored<MusidexMetadata>("metadata", emptyMetadata());

    API.setAPIUrl("http://localhost:3200");

    useEffect(() => {
        API.getMetadata().then((m) => {
            if (m === null) {
                return;
            }
            setMetadata(m);
        })
    }, []);

    return (
        <View style={styles.container}>
            <TextFg>I like to dance</TextFg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.bg,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});
