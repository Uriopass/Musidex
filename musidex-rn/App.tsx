/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useCallback, useEffect} from 'react';
import {Image, Platform, StatusBar, View} from 'react-native';

import useCachedResources, {DEFAULT_CAPABILITIES} from "./domain/useCachedResources";
import Navigation from "./navigation";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Colors from "./domain/colors";
import useStored from "./domain/useStored";
import {emptyMetadata, MusidexMetadata, newMetadata} from "./common/entity";
import API, {RawMusidexMetadata} from "./common/api";
import Ctx from "./domain/ctx";
import {LocalSettings, newLocalSettings} from "./domain/localsettings";
import {useMemoProv} from "./common/utils";
import TrackPlayer, {CAPABILITY_JUMP_FORWARD} from "react-native-track-player";

export default function App() {
    const isLoadingComplete = useCachedResources();
    const [metadata, setMetadata, loadedMeta] = useStored<MusidexMetadata>("metadata", 0, emptyMetadata(), {
        ser: (v: MusidexMetadata): string => {
            return JSON.stringify(v.raw);
        },
        deser: (v: string): MusidexMetadata => {
            const obj: RawMusidexMetadata = JSON.parse(v);
            return newMetadata(obj);
        },
    });

    const [localSettings, setLocalSettings, loadedSettings] = useStored<LocalSettings>("local_settings", 3, newLocalSettings());

    const [apiURL, setAPIUrl, loadedAPI] = useStored<string>("api_url", 0, "");
    API.setAPIUrl(apiURL);

    let fetchMetadata = useCallback(() => {
        return API.getMetadata().then((meta) => {
            if (meta === null) {
                console.log("fetched null metadata?");
                return;
            }
            setMetadata(meta);
        })
    }, [setMetadata]);

    const metaa: [MusidexMetadata, any] = useMemoProv([metadata, fetchMetadata]);

    useEffect(() => {
        if (!loadedSettings || !isLoadingComplete || Platform.OS === "android") {
            return;
        }
        let cap = DEFAULT_CAPABILITIES;
        if (localSettings.iosEnableJumpForward) {
            cap = cap.concat([CAPABILITY_JUMP_FORWARD]);
        }
        TrackPlayer.updateOptions({
            capabilities: cap,
        });
    }, [localSettings, loadedSettings, isLoadingComplete])

    if (!isLoadingComplete || !loadedMeta || !loadedAPI || !loadedSettings) {
        return <View style={{backgroundColor: '#383838', flex: 1, alignItems: "center", justifyContent: "center"}}>
            <Image source={require('./musidex_logo.png')}/>
        </View>;
    } else {
        return (
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={Colors.bg}/>
                <Ctx.Metadata.Provider value={metaa}>
                    <Ctx.APIUrl.Provider value={[apiURL, setAPIUrl]}>
                        <Ctx.LocalSettings.Provider value={[localSettings, setLocalSettings]}>
                            <Navigation/>
                        </Ctx.LocalSettings.Provider>
                    </Ctx.APIUrl.Provider>
                </Ctx.Metadata.Provider>
            </SafeAreaProvider>
        );
    }
}
