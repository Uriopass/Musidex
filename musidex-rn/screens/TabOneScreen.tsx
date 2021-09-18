import * as React from 'react';
import {useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';

import EditScreenInfo from '../components/EditScreenInfo';
import {Text, View} from '../components/Themed';
import API from "../common/api";

export default function TabOneScreen() {
    let [v, setV] = useState(0);

    API.setAPIUrl("http://localhost:3200");

    useEffect(() => {
        API.getMetadata().then((m) => {
            setV(m?.musics.length || -1);
        })
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>#Musics: {v}</Text>
            <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)"/>
            <EditScreenInfo path="/screens/TabOneScreen.tsx"/>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
