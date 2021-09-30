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
import {StatusBar,} from 'react-native';

import useCachedResources from "./domain/useCachedResources";
import Navigation from "./navigation";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Colors from "./constants/Colors";

export default function App() {
    const isLoadingComplete = useCachedResources();

    if (!isLoadingComplete) {
        return null;
    } else {
        return (
            <SafeAreaProvider>
                <StatusBar backgroundColor={Colors.bg}/>
                <Navigation/>
            </SafeAreaProvider>
        );
    }
}
