/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';

import NotFoundScreen from '../screens/NotFoundScreen';
import {RootStackParamList} from '../types';
import LinkingConfiguration from './LinkingConfiguration';
import MainScreen from "../screens/MainScreen";
import useStored from "../domain/useStored";
import {emptyMetadata, MusidexMetadata} from "../common/entity";
import API from "../common/api";
import {MetadataCtx} from "../constants/Contexts";
import Tracklist, {
    emptyTracklist,
    TrackPlayerAction,
    useCanPrev,
    useNextTrackCallback,
    usePrevTrackCallback,
    TracklistCtx
} from "../common/tracklist";
import Filters, {newFilters} from "../common/filters";

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
    API.setAPIUrl("http://192.168.0.14:3200");

    let [metadata, setMetadata] = useStored<MusidexMetadata>("metadata", emptyMetadata());

    const dispatchPlayer = (action: TrackPlayerAction) => {
        console.log(action);
    };

    const [user, setUser] = useStored<number | undefined>("user", metadata.users[0]?.id);
    const [filters, setFilters] = useStored<Filters>("filters", newFilters());
    const [list, setList] = useState<Tracklist>(emptyTracklist())

    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, filters, user);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const canPrev = useCanPrev(list);

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
            <TracklistCtx.Provider value={list}>
                <Stack.Navigator screenOptions={{headerShown: false}}>
                    <Stack.Screen name="Root" component={MainScreen}/>
                    <Stack.Screen name="NotFound" component={NotFoundScreen} options={{title: 'Oops!'}}/>
                </Stack.Navigator>
            </TracklistCtx.Provider>
        </MetadataCtx.Provider>
    );
}