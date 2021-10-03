import * as React from 'react';
import Explorer from "../components/Explorer";
import {SafeAreaView, StyleSheet} from "react-native";
import SmallPlayer from "../components/SmallPlayer";
import Colors from "../domain/Colors";

export default function MainScreen() {
    return (

        <SafeAreaView style={styles.container}>
            <Explorer/>
            <SmallPlayer style={styles.player}/>
        </SafeAreaView>
    );
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
})