import * as React from 'react';
import Explorer from "../components/Explorer";
import {BackHandler, SafeAreaView, StyleSheet} from "react-native";
import SmallPlayer from "../components/SmallPlayer";
import Colors from "../domain/colors";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {Header} from "../components/Header";
import {useContext, useEffect} from "react";
import Ctx from "../domain/ctx";
import {DrawerActions, useNavigation} from "@react-navigation/native";

const Stack = createNativeStackNavigator();

function Root() {
    const [user] = useContext(Ctx.User);
    const [metadata] = useContext(Ctx.Metadata);
    const navigation = useNavigation();

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.dispatch(DrawerActions.openDrawer());
            return true; // Prevent default behavior (exit app)
        });

        return () => backHandler.remove();
    }, [navigation]);

    return (<SafeAreaView style={styles.container}>
        <Header title={metadata.users.find((x) => x.id === user)?.name || "Home"}/>
        <Explorer/>
        <SmallPlayer/>
    </SafeAreaView>);
}

export default function MainScreen() {
    return (<Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Root" component={Root}/>
    </Stack.Navigator>);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
});
