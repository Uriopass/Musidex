/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import {Image, StatusBar, View} from 'react-native';

import useCachedResources from "./domain/useCachedResources";
import Navigation from "./navigation";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Colors from "./domain/colors";
import useStored from "./domain/useStored";
import {emptyMetadata, MusidexMetadata, newMetadata} from "./common/entity";
import API, {RawMusidexMetadata} from "./common/api";
import Ctx from "./domain/ctx";
import {newSyncState, syncIter, SyncState} from "./domain/sync";

export default function App() {
    const isLoadingComplete = useCachedResources();
    const [metadata, setMetadata, loaded] = useStored<MusidexMetadata>("metadata", emptyMetadata(), {
        ser: (v: MusidexMetadata): string => {
            return JSON.stringify(v.raw);
        },
        deser: (v: string): MusidexMetadata => {
            const obj: RawMusidexMetadata = JSON.parse(v);
            return newMetadata(obj);
        },
    });

    const [apiURL, setAPIUrl, loadedAPI] = useStored<string>("api_url", "");
    API.setAPIUrl(apiURL);

    const [syncState, setSyncState] = useState<SyncState | undefined>(undefined);
    useEffect(() => {
        newSyncState(metadata).then((v) => setSyncState(v));
    }, [metadata])

    useEffect(() => {
        if (syncState === undefined) {
            return;
        }
        let curTimeout: number | undefined = undefined;
        const f = async () => {
            const newSync = await syncIter(metadata, syncState);
            if (newSync === undefined) {
                curTimeout = setTimeout(f, 30000);
                return;
            }
            curTimeout = setTimeout(f, 1000);
        };
        f();
        return () => {
            if(curTimeout) {
                clearTimeout(curTimeout);
            }
        }
    }, [syncState]);

    let fetchMetadata = useCallback(() => {
        return API.getMetadata().then((meta) => {
            if (meta === null) {
                console.log("fetched null metadata?");
                return;
            }
            setMetadata(meta);
        })
    }, [setMetadata]);

    if (!isLoadingComplete || !loaded || !loadedAPI || syncState === undefined) {
        return <View style={{backgroundColor: '#383838', flex: 1, alignItems: "center", justifyContent: "center"}}>
            <Image source={require('./musidex_logo.png')}/>
        </View>;
    } else {
        return (
            <SafeAreaProvider>
                <StatusBar backgroundColor={Colors.bg}/>
                <Ctx.Metadata.Provider value={[metadata, fetchMetadata]}>
                    <Ctx.APIUrl.Provider value={[apiURL, setAPIUrl]}>
                        <Ctx.SyncState.Provider value={syncState}>
                            <Navigation/>
                        </Ctx.SyncState.Provider>
                    </Ctx.APIUrl.Provider>
                </Ctx.Metadata.Provider>
            </SafeAreaProvider>
        );
    }
}
