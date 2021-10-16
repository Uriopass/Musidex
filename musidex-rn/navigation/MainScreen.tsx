import * as React from 'react';
import Explorer from "../components/Explorer";
import {SafeAreaView, StyleSheet} from "react-native";
import SmallPlayer from "../components/SmallPlayer";
import Colors from "../domain/colors";
import {createNativeStackNavigator} from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

function Root() {
    return (<SafeAreaView style={styles.container}>
        <Explorer/>
        <SmallPlayer style={styles.player}/>
    </SafeAreaView>)
}

export default function MainScreen() {
    return (<Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Root" component={Root}/>
    </Stack.Navigator>)
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
