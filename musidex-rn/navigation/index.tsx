/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import * as React from 'react';
import {useCallback, useEffect} from 'react';

import NotFoundScreen from '../screens/NotFoundScreen';
import {RootStackParamList} from '../types';
import LinkingConfiguration from './LinkingConfiguration';
import MainScreen from "../screens/MainScreen";
import useStored from "../hooks/useStored";
import {emptyMetadata, MusidexMetadata} from "../common/entity";
import API from "../common/api";

export default function Navigation() {
    return (
        <NavigationContainer
            linking={LinkingConfiguration}>
            <RootNavigator/>
        </NavigationContainer>
    );
}

// A root stack navigator is often used for displaying modals on top of all other content
// Read more here: https://reactnavigation.org/docs/modal
const Stack = createStackNavigator<RootStackParamList>();

function RootNavigator() {
    let [metadata, setMetadata] = useStored<MusidexMetadata>("metadata", emptyMetadata());

    API.setAPIUrl("http://192.168.0.14:3200");

    useEffect(() => {
        API.getMetadata().then((m) => {
            if (m === null) {
                return;
            }
            setMetadata(m);
        })
    }, []);

    let fetchMetadata = useCallback(() => {
        console.log("fetch metadata");
    }, []);

    return (
        <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
            <Stack.Navigator screenOptions={{headerShown: false}}>
                <Stack.Screen name="Root" component={MainScreen}/>
                <Stack.Screen name="NotFound" component={NotFoundScreen} options={{title: 'Oops!'}}/>
            </Stack.Navigator>
        </MetadataCtx.Provider>
    );
}

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);