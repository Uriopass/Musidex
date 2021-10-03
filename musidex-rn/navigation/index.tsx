/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as React from 'react';
import {useCallback, useEffect, useReducer, useState} from 'react';

import MainScreen from "../screens/MainScreen";
import useStored from "../domain/useStored";
import {emptyMetadata, MusidexMetadata} from "../common/entity";
import API from "../common/api";
import {ControlsCtx, MetadataCtx, TrackplayerCtx} from "../constants/Contexts";
import Tracklist, {
    emptyTracklist,
    TracklistCtx,
    updateScoreCache,
    useNextTrackCallback,
    usePrevTrackCallback
} from "../common/tracklist";
import Filters, {newFilters} from "../common/filters";
import {applyTrackPlayer, newTrackPlayer, setupListeners} from "../domain/trackplayer";

export default function Navigation() {
    return (
        <NavigationContainer>
            <RootNavigator/>
        </NavigationContainer>
    );
}

// A root stack navigator is often used for displaying modals on top of all other content
// Read more here: https://reactnavigation.org/docs/modal
const Stack = createNativeStackNavigator();

function RootNavigator() {
    API.setAPIUrl("http://192.168.0.14:3200");

    let [metadata, setMetadata] = useStored<MusidexMetadata>("metadata", emptyMetadata());

    const [user, setUser] = useStored<number | undefined>("user", undefined);
    const [filters, setFilters] = useStored<Filters>("filters", newFilters());
    const [list, setList] = useState<Tracklist>(emptyTracklist())

    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, filters, user);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);

    setupListeners(trackplayer, dispatchPlayer, doNext);

    useEffect(() => {
        API.getMetadata().then((meta) => {
            if (meta === null) {
                return;
            }
            setMetadata(meta);
            if (user === undefined || !meta.users.some((u) => u.id === user)) {
                const u = meta.firstUser();
                if (u !== undefined) {
                    setUser(u);
                }
            }
            let l = {...list};
            l = updateScoreCache(l, meta);
            setList(l);
        })
    }, []);

    let fetchMetadata = useCallback(() => {
        console.log("fetch metadata");
    }, []);

    return (
        <MetadataCtx.Provider value={[metadata, fetchMetadata]}>
            <TracklistCtx.Provider value={list}>
                <ControlsCtx.Provider value={[doNext, doPrev]}>
                    <TrackplayerCtx.Provider value={[trackplayer, dispatchPlayer]}>
                        <Stack.Navigator screenOptions={{headerShown: false}}>
                            <Stack.Screen name="Root" component={MainScreen}/>
                        </Stack.Navigator>
                    </TrackplayerCtx.Provider>
                </ControlsCtx.Provider>
            </TracklistCtx.Provider>
        </MetadataCtx.Provider>
    );
}