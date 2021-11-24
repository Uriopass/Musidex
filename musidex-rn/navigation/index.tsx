/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import * as React from 'react';
import {useCallback, useContext, useEffect, useMemo, useReducer, useState} from 'react';

import MainScreen from "./MainScreen";
import useStored from "../domain/useStored";
import {firstUser, User} from "../common/entity";
import Ctx from "../domain/ctx";
import Tracklist, {
    emptyTracklist,
    NextTrackCallback,
    PrevTrackCallback,
    updateScoreCache,
    useNextTrackCallback,
    usePrevTrackCallback,
    useResetCallback,
} from "../common/tracklist";
import {newSearchForm, SearchForm, useMusicSelect} from "../common/filters";
import Trackplayer, {applyTrackPlayer, newTrackPlayer, useSetupListeners} from "../domain/trackplayer";
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
import {Mutex} from 'async-mutex';
import {useMemoProv} from "../common/utils";
import TrackPlayer from "react-native-track-player";

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
    const [metadata, fetchMetadata] = useContext(Ctx.Metadata);
    const [apiURL] = useContext(Ctx.APIUrl);
    const [localSettings] = useContext(Ctx.LocalSettings);

    const [list, setList, loadedListe] = useStored<Tracklist>("tracklist", 0, emptyTracklist(), {
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
    const [user, setUser, loadedUser] = useStored<number | undefined>("user", 0, firstUser(metadata));
    const [searchForm, setSearchForm, loadedSF] = useStored<SearchForm>("searchForm", 2, newSearchForm(user));
    const [lastPosition, setLastPosition, loadedPosition] = useStored<[number, number] | undefined>("last_position", 0, undefined);

    const loaded = loadedListe && loadedUser && loadedSF && loadedPosition;

    useEffect(() => {
        fetchMetadata()
    }, [apiURL]);

    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const selectedMusics = useMusicSelect(metadata, searchForm, list);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, searchForm, selectedMusics, lastPosition, setLastPosition, TrackPlayer.getPosition);
    const doPrev = usePrevTrackCallback(list, setList, dispatchPlayer, metadata);
    const doReset = useResetCallback(setList, metadata);

    useSetupListeners(trackplayer, dispatchPlayer, doNext, doPrev);

    useEffect(() => {
        if (!loaded) {
            return
        }
        if (searchForm.filters.user === undefined) {
            setSearchForm({
                ...searchForm,
                filters: {
                    ...searchForm.filters,
                    user: user,
                }
            })
        }
    }, [loaded]);

    useEffect(() => {
        if (!loaded) {
            return
        }
        if (user === undefined || !metadata.users.some((u) => u.id === user)) {
            const u = firstUser(metadata);
            if (u !== undefined) {
                setUser(u);
            }
        }

        let l = {...list};
        l = updateScoreCache(l, metadata);
        setList(l);
    }, [metadata, loaded]);

    const [syncState, setSyncState] = useState<SyncState>(emptySyncState);
    useEffect(() => {
        newSyncState().then((v) => setSyncState(v));
    }, [])

    const musicsToDownload: number[] = useMemo(() => {
        if (!localSettings.downloadMusicLocally) {
            return [];
        }
        const uSet = new Set<number>(localSettings.downloadUsers);
        let mSet = new Set<number>();
        for (let tag of metadata.tags) {
            if (tag.key.startsWith("user_library:")) {
                let uId = parseInt(tag.key.substring("user_library:".length));
                if (uSet.has(uId)) {
                    mSet.add(tag.music_id);
                }
            }
        }
        return [...mSet];
    }, [localSettings, metadata]);

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
            const changed = await syncIter(metadata, syncState, musicsToDownload);
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

    const setUserDrawer = useCallback((u: number | undefined) => {
        setUser(u);
        setSearchForm({
            ...searchForm,
            filters: {
                ...searchForm.filters,
                user: u,
            }
        })
    }, [setUser, setSearchForm, searchForm])

    const controls = useMemoProv<[NextTrackCallback, PrevTrackCallback, () => void]>([doNext, doPrev, doReset]);
    const playerr = useMemoProv<[Trackplayer, any]>([trackplayer, dispatchPlayer]);
    const userr = useMemoProv<[number | undefined, any]>([user, setUser]);

    if (!loaded) {
        return <></>;
    }

    return (
        <Ctx.User.Provider value={userr}>
            <Ctx.Tracklist.Provider value={list}>
                <Ctx.Controls.Provider value={controls}>
                    <Ctx.Trackplayer.Provider value={playerr}>
                        <Ctx.SearchForm.Provider value={[searchForm, setSearchForm]}>
                            <Ctx.SelectedMusics.Provider value={selectedMusics}>
                                <Ctx.SyncState.Provider value={syncState}>
                                    <MusidexDrawer users={metadata.users} curUser={user} setUser={setUserDrawer}/>
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