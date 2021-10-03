/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import {Image, StatusBar, View,} from 'react-native';

import useCachedResources from "./domain/useCachedResources";
import Navigation from "./navigation";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Colors from "./domain/colors";

export default function App() {
    const isLoadingComplete = useCachedResources();

    if (!isLoadingComplete) {
        return <View style={{backgroundColor: '#383838', flex: 1, alignItems: "center", justifyContent: "center"}}>
            <Image source={require('./musidex_logo.png')} />
        </View>
    } else {
        return (
            <SafeAreaProvider>
                <StatusBar backgroundColor={Colors.bg}/>
                <Navigation/>
            </SafeAreaProvider>
        );
    }
}
