/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import * as React from 'react';
import {useContext, useEffect, useReducer, useState} from 'react';

import MainScreen from "./MainScreen";
import useStored from "../domain/useStored";
import {firstUser, User} from "../common/entity";
import Ctx from "../domain/ctx";
import Tracklist, {
    emptyTracklist,
    updateScoreCache,
    useNextTrackCallback,
    usePrevTrackCallback,
    useResetCallback,
} from "../common/tracklist";
import {newSearchForm, SearchForm, useMusicSelect} from "../common/filters";
import {applyTrackPlayer, newTrackPlayer, useSetupListeners} from "../domain/trackplayer";
import {
    createDrawerNavigator,
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItem,
} from '@react-navigation/drawer';
import {StyleSheet, View} from "react-native";
import Colors from "../domain/colors";
import SettingsScreen from "./SettingsScreen";
import {emptySyncState, newSyncState, syncIter, SyncState} from "../domain/sync";
import { Mutex } from 'async-mutex';

export default function Navigation() {
    return (
        <NavigationContainer>
            <RootNavigator/>
        </NavigationContainer>
    );
}

const Drawer = createDrawerNavigator();

let loll = 0;
let fetchMutex = new Mutex();

function RootNavigator() {
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
    const [metadata, fetchMetadata] = useContext(Ctx.Metadata);
    const [apiURL] = useContext(Ctx.APIUrl);
    const [localSettings] = useContext(Ctx.LocalSettings);

    const [user, setUser] = useStored<number | undefined>("user", firstUser(metadata));
    const [searchForm, setSearchForm] = useStored<SearchForm>("searchForm", newSearchForm());

    useEffect(() => {
        fetchMetadata()
    }, [apiURL]);

    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const selectedMusics = useMusicSelect(metadata, searchForm, list, user);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, searchForm, selectedMusics);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const doReset = useResetCallback(setList, metadata);

    useSetupListeners(trackplayer, dispatchPlayer, doNext, doPrev);

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

    const [syncState, setSyncState] = useState<SyncState>(emptySyncState);
    useEffect(() => {
        newSyncState().then((v) => setSyncState(v));
    }, [])

    useEffect(() => {
        loll += 1;
        if (syncState === undefined || !syncState.loaded || !localSettings.downloadMusicLocally || apiURL === "") {
            return;
        }
        let cpy = loll;
        let curTimeout: number | undefined = undefined;
        const f = async () => {
            const release = await fetchMutex.acquire();
            if (cpy != loll) {
                release();
                return;
            }
            const changed = await syncIter(metadata, syncState);
            release();
            if (cpy != loll) {
                return;
            }
            if (!changed) {
                curTimeout = setTimeout(f, 30000);
                return;
            }
            curTimeout = setTimeout(f, 50);
        };
        f();
        return () => {
            if (curTimeout) {
                clearTimeout(curTimeout);
            }
        }
    }, [syncState, localSettings, apiURL, metadata, setSyncState]);

    return (
        <Ctx.User.Provider value={[user, setUser]}>
            <Ctx.Tracklist.Provider value={list}>
                <Ctx.Controls.Provider value={[doNext, doPrev, doReset]}>
                    <Ctx.Trackplayer.Provider value={[trackplayer, dispatchPlayer]}>
                        <Ctx.SearchForm.Provider value={[searchForm, setSearchForm]}>
                            <Ctx.SelectedMusics.Provider value={selectedMusics}>
                                <Ctx.SyncState.Provider value={syncState}>
                                    <MusidexDrawer users={metadata.users} curUser={user} setUser={setUser}/>
                                </Ctx.SyncState.Provider>
                            </Ctx.SelectedMusics.Provider>
                        </Ctx.SearchForm.Provider>
                    </Ctx.Trackplayer.Provider>
                </Ctx.Controls.Provider>
            </Ctx.Tracklist.Provider>
        </Ctx.User.Provider>);
}

type MusidexDrawerProps = {
    users: User[],
    curUser: number | undefined,
    setUser: (user: number) => void;
}

const MusidexDrawer = React.memo((props: MusidexDrawerProps) => {
    return (
        <Drawer.Navigator
            drawerContent={CustomDrawerContent(props)}
            screenOptions={() => {
                return {
                    drawerStyle: styles.drawer,
                    headerShown: false,
                    drawerType: "front",
                    overlayColor: Colors.bg,
                    swipeEdgeWidth: 75,
                }
            }} initialRouteName={props.curUser === undefined ? "Settings" : "Home"}>
            <Drawer.Screen name="Home" component={MainScreen}/>
            <Drawer.Screen name="Settings" component={SettingsScreen}/>
        </Drawer.Navigator>
    )
})

function CustomDrawerContent(d: MusidexDrawerProps): (props: DrawerContentComponentProps) => any {
    return (props) => {
        const DrawerItemLink = (lprops: any) => {
            return <DrawerItem style={styles.drawerItem}
                               labelStyle={styles.drawerItemLabel}
                               activeBackgroundColor={Colors.primaryDarker}
                               activeTintColor={Colors.colorfg}
                               inactiveBackgroundColor={Colors.bg}
                               focused={lprops.focused}
                               inactiveTintColor={Colors.colorfg}
                               label={lprops.label}
                               onPress={() => {
                                   lprops.onPress?.();
                                   props.navigation.jumpTo(lprops.link);
                               }}/>
        }

        const focusedRoute = props.state.routes[props.state.index];

        return (
            <DrawerContentScrollView {...props}>
                {d.users.map((user) => {
                    return <DrawerItemLink
                        key={user.id}
                        label={user.name}
                        link="Home"
                        focused={focusedRoute.name === "Home" && user.id === d.curUser}
                        onPress={() => {
                            if (user.id !== d.curUser) {
                                d.setUser(user.id);
                            }
                        }}/>
                })}
                <View style={{height: 20}}/>
                <DrawerItemLink label="Settings"
                                link="Settings"
                                focused={focusedRoute.name === "Settings"}/>
            </DrawerContentScrollView>
        );
    }
}

const styles = StyleSheet.create({
    drawerItem: {},
    drawerItemLabel: {},
    drawer: {
        backgroundColor: Colors.fg,
    }
})