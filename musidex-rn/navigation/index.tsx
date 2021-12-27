/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {NavigationContainer} from '@react-navigation/native';
import * as React from 'react';
import {useCallback, useContext, useEffect, useMemo, useReducer, useState} from 'react';

import MainScreen from "./MainScreen";
import useStored, {useStoredRef} from "../domain/useStored";
import {firstUser, getTags, User} from "../common/entity";
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
import {createDrawerNavigator, DrawerContentComponentProps, DrawerContentScrollView,} from '@react-navigation/drawer';
import {Pressable, StyleSheet, TouchableOpacity, View} from "react-native";
import Colors from "../domain/colors";
import SettingsScreen from "./SettingsScreen";
import {emptySyncState, newSyncState, syncIter, SyncState} from "../domain/sync";
import {Mutex} from 'async-mutex';
import {useMemoProv} from "../common/utils";
import TrackPlayer from "react-native-track-player";
import {TextFg} from "../components/StyledText";
import {Icon} from "react-native-elements";
import {LocalSettings} from "../domain/localsettings";
import {PositionStorage} from "../domain/positionStorage";

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
let avoidFirst = 0;

function RootNavigator() {
    const [metadata, fetchMetadata] = useContext(Ctx.Metadata);
    const [apiURL] = useContext(Ctx.APIUrl);
    const [localSettings] = useContext(Ctx.LocalSettings);

    const [list, setList, loadedListe] = useStored<Tracklist>("tracklist", emptyTracklist(), {
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
    const [user, setUser, loadedUser] = useStored<number | undefined>("user", firstUser(metadata));
    const [searchForm, setSearchForm, loadedSF] = useStored<SearchForm>("searchForm", newSearchForm(user));
    const [lastPosition, updateLastPosition, loadedPosition] = useStoredRef<PositionStorage>("last_position_v2", {positions: {}});

    const loaded = loadedListe && loadedUser && loadedSF && loadedPosition;

    useEffect(() => {
        if(!loaded) {
            return;
        }
        let timeout: any = {t: undefined};
        const last = list.last_played[list.last_played.length-1];
        const duration = getTags(metadata, last)?.get("duration")?.integer;
        if (duration === undefined || duration < 30*60) {
            return;
        }
        let update = async () => {
            const pos = await TrackPlayer.getPosition();
            updateLastPosition((v) => {
                v.current.positions[last] = pos;
            });
            timeout.t = setTimeout(update, 5000);
        }

        update();

        return () => {
            if(timeout) {
                clearTimeout(timeout.t);
            }
        }
    }, [metadata, list, lastPosition, updateLastPosition])

    useEffect(() => {
        if (avoidFirst === 0) {
            return;
        }
        avoidFirst += 1;
        fetchMetadata()
    }, [apiURL]);

    const [trackplayer, dispatchPlayer] = useReducer(applyTrackPlayer, newTrackPlayer());
    const selectedMusics = useMusicSelect(metadata, searchForm, list);
    const doNext = useNextTrackCallback(list, setList, dispatchPlayer, metadata, searchForm, selectedMusics, lastPosition);
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
    const [settings, setSettings] = useContext(Ctx.LocalSettings);
    const favorites = useMemo(() => new Set(settings.favorites), [settings.favorites]);

    return (
        <Drawer.Navigator
            drawerContent={CustomDrawerContent(props, favorites, settings, setSettings)}
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

function CustomDrawerContent(d: MusidexDrawerProps, favorites: Set<number>, settings: LocalSettings, setSettings: (newv: LocalSettings) => void): (props: DrawerContentComponentProps) => any {
    return (props) => {
        const DrawerItemLink = (lprops: any) => {
            return <Pressable
                style={[styles.drawerItem, lprops.focused && styles.drawItemFocused]}
                android_ripple={{color: Colors.primary}}
                onPress={() => {
                    lprops.onPress?.();
                    props.navigation.jumpTo(lprops.link);
                }}>
                <TextFg style={styles.drawerText}>{lprops.label}</TextFg>
                {(lprops.isFavorite !== undefined) &&
                <TouchableOpacity onPress={lprops.onFavoriteToggle}>
                    <Icon
                        style={styles.drawerFavorite}
                        size={20}
                        name={lprops.isFavorite ? "favorite" : "favorite-outline"}
                        color={lprops.isFavorite && Colors.danger}
                    />
                </TouchableOpacity>}
            </Pressable>
        }

        const focusedRoute = props.state.routes[props.state.index];

        const renderDrawerUser = (user: User) => {
            return <DrawerItemLink
                key={user.id}
                label={user.name}
                link="Home"
                isFavorite={favorites.has(user.id)}
                onFavoriteToggle={() => {
                    if (favorites.has(user.id)) {
                        const cp = [...settings.favorites];
                        cp.splice(cp.indexOf(user.id), 1);
                        setSettings({
                            ...settings,
                            favorites: cp,
                        });
                    } else {
                        setSettings({
                            ...settings,
                            favorites: settings.favorites.concat([user.id])
                        });
                    }
                }}
                focused={focusedRoute.name === "Home" && user.id === d.curUser}
                onPress={() => {
                    if (user.id !== d.curUser) {
                        d.setUser(user.id);
                    }
                }}/>
        };

        return (
            <DrawerContentScrollView {...props}>
                {d.users.map((u) => {
                    if (favorites.has(u.id)) {
                        return renderDrawerUser(u);
                    }
                })}
                {d.users.map((u) => {
                    if (!favorites.has(u.id)) {
                        return renderDrawerUser(u);
                    }
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
    drawerItem: {
        paddingLeft: 12,
        borderRadius: 5,
        backgroundColor: Colors.bg,
        marginHorizontal: 10,
        marginVertical: 4,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    drawerText: {
        paddingVertical: 13,
    },
    drawerFavorite: {
        paddingVertical: 13,
        paddingHorizontal: 10,
    },
    drawItemFocused: {
        backgroundColor: Colors.primaryDarker,
    },
    drawer: {
        backgroundColor: Colors.fg,
    }
})