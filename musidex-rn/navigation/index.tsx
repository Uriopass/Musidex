/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
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
import {newSearchForm, SearchForm, useMusicSelect} from "../common/filters";
import {applyTrackPlayer, newTrackPlayer, useSetupListeners} from "../domain/trackplayer";
import {createDrawerNavigator, DrawerContentScrollView, DrawerItem, DrawerItemList} from '@react-navigation/drawer';
import {TextFg} from "../components/StyledText";
import {StyleSheet, View} from "react-native";
import Colors from "../domain/colors";
import {Icon} from "react-native-elements";

export default function Navigation() {
    return (
        <NavigationContainer>
            <RootNavigator/>
        </NavigationContainer>
    );
}

const Drawer = createDrawerNavigator();

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
                                    <MusidexDrawer/>
                                </Ctx.SelectedMusics.Provider>
                            </Ctx.SearchForm.Provider>
                        </Ctx.Trackplayer.Provider>
                    </Ctx.Controls.Provider>
                </Ctx.Tracklist.Provider>
            </Ctx.Metadata.Provider>
        </Ctx.User.Provider>);
}

const Test = () => (<>
    <TextFg>salut</TextFg>
</>);

function MusidexDrawer() {
    return (
        <Drawer.Navigator screenOptions={(props) => {
            return {
                drawerStyle: styles.drawer,
                drawerActiveBackgroundColor: Colors.primaryDarker,
                drawerActiveTintColor: Colors.colorfg,
                drawerInactiveBackgroundColor: Colors.bg,
                drawerInactiveTintColor: Colors.colorfg,
                headerShown: true,
                headerStyle: styles.header,
                drawerType: "front",
                overlayColor: Colors.bg,
                headerTitleStyle: styles.headerTitle,
                swipeEdgeWidth: 1000,
                headerLeft:
                    () => (<View style={{paddingLeft: 16}}>
                        <Icon
                            name="menu"
                            size={25}
                            color={Colors.colorbg}
                            onPress={() => props.navigation.openDrawer()}/>
                    </View>),
            }
        }} initialRouteName="Home">
            <Drawer.Screen name="Home" component={MainScreen}/>
            <Drawer.Screen name="Notifications" component={Test}/>
        </Drawer.Navigator>
    )
}


const styles = StyleSheet.create({
    drawer: {
        backgroundColor: Colors.fg,
    },
    header: {
        height: 30,
        backgroundColor: Colors.bg,
    },
    headerTitle: {
        color: Colors.colorbg,
    }
})