/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as React from 'react';
import {useCallback, useEffect, useReducer} from 'react';

import MainScreen from "../screens/MainScreen";
import useStored from "../domain/useStored";
import {emptyMetadata, firstUser, MusidexMetadata, newMetadata} from "../common/entity";
import API, {RawMusidexMetadata} from "../common/api";
import Ctx from "../domain/ctx";
import Tracklist, {
    emptyTracklist,
    updateScoreCache,
    useNextTrackCallback,
    usePrevTrackCallback, useResetCallback,
} from "../common/tracklist";
import Filters, {newFilters, newSearchForm, SearchForm, useMusicSelect} from "../common/filters";
import {applyTrackPlayer, newTrackPlayer, useSetupListeners} from "../domain/trackplayer";

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

    const [list, setList] = useStored<Tracklist>("tracklist", emptyTracklist(), {
        ser: v => {
            let lol = {...v, score_map: [...v.score_map]};
            return JSON.stringify(lol);
        },
        deser: s => {
            let obj: any = JSON.parse(s);
            obj.score_map = new Map(obj.score_map);
            return obj as Tracklist;
        },
    });
    const [metadata, setMetadata] = useStored<MusidexMetadata>("metadata", emptyMetadata(), {
        ser: (v: MusidexMetadata): string => {
            return JSON.stringify(v.raw);
        },
        deser: (v: string): MusidexMetadata => {
            const obj: RawMusidexMetadata = JSON.parse(v);
            return newMetadata(obj);
        },
    });

    const [user, setUser] = useStored<number | undefined>("user", undefined);
    const [searchForm, setSearchForm] = useStored<SearchForm>("searchForm", newSearchForm());

    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const selectedMusics = useMusicSelect(metadata, searchForm, list, user);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, searchForm, selectedMusics);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const doReset = useResetCallback(setList, metadata);

    useSetupListeners(trackplayer, dispatchPlayer, doNext);

    useEffect(() => {
        if (user === undefined || !metadata.users.some((u) => u.id === user)) {
            const u = firstUser(metadata);
            if (u !== undefined) {
                setUser(u);
            }
        }

        let l = {...list};
        l = updateScoreCache(l, metadata);
        setList(l);
    }, [metadata]);

    let fetchMetadata = useCallback(() => {
        API.getMetadata().then((meta) => {
            if (meta === null) {
                return;
            }
            setMetadata(meta);
        });
    }, []);
    useEffect(fetchMetadata, []);

    return (
        <Ctx.User.Provider value={[user, setUser]}>
        <Ctx.Metadata.Provider value={[metadata, fetchMetadata]}>
        <Ctx.Tracklist.Provider value={list}>
        <Ctx.Controls.Provider value={[doNext, doPrev, doReset]}>
        <Ctx.Trackplayer.Provider value={[trackplayer, dispatchPlayer]}>
        <Ctx.SearchForm.Provider value={[searchForm, setSearchForm]}>
        <Ctx.SelectedMusics.Provider value={selectedMusics}>
            <Stack.Navigator screenOptions={{headerShown: false}}>
                <Stack.Screen name="Root" component={MainScreen}/>
            </Stack.Navigator>
        </Ctx.SelectedMusics.Provider>
        </Ctx.SearchForm.Provider>
        </Ctx.Trackplayer.Provider>
        </Ctx.Controls.Provider>
        </Ctx.Tracklist.Provider>
        </Ctx.Metadata.Provider>
        </Ctx.User.Provider>);
}
