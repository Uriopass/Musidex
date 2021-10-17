import * as React from 'react';
import {SafeAreaView, StyleSheet} from "react-native";
import SmallPlayer from "../components/SmallPlayer";
import Colors from "../domain/colors";
import Settings from "../components/Settings";
import {Header} from "../components/Header";

function SettingsScreen() {
    return (<SafeAreaView style={styles.container}>
        <Header title="Settings"/>
        <Settings/>
        <SmallPlayer style={styles.player}/>
    </SafeAreaView>)
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
});

export default SettingsScreen;