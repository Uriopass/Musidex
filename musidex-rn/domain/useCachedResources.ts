import * as React from 'react';
import TrackPlayer, {
    CAPABILITY_JUMP_FORWARD,
    CAPABILITY_PAUSE,
    CAPABILITY_PLAY,
    CAPABILITY_SEEK_TO,
    CAPABILITY_SKIP_TO_NEXT,
    CAPABILITY_SKIP_TO_PREVIOUS
} from 'react-native-track-player';
import {Platform} from "react-native";

export default function useCachedResources() {
    const [isLoadingComplete, setLoadingComplete] = React.useState(false);

    // Load any resources or data that we need prior to rendering the app
    React.useEffect(() => {
        async function loadResourcesAndDataAsync() {
            try {
                await TrackPlayer.setupPlayer({iosCategory: 'playback', waitForBuffer: true, minBuffer: 5});

                let cap = [
                    CAPABILITY_PLAY,
                    CAPABILITY_PAUSE,
                    CAPABILITY_SEEK_TO,
                    CAPABILITY_SKIP_TO_NEXT,
                    CAPABILITY_SKIP_TO_PREVIOUS,
                ];

                if (Platform.OS === "android") {
                    cap.push(CAPABILITY_JUMP_FORWARD);
                }

                await TrackPlayer.updateOptions({
                    stopWithApp: true,
                    // Media controls capabilities
                    capabilities: cap,

                    // Capabilities that will show up when the notification is in the compact form on Android
                    compactCapabilities: [CAPABILITY_PLAY, CAPABILITY_PAUSE, CAPABILITY_SKIP_TO_NEXT, CAPABILITY_JUMP_FORWARD],
                });
            } catch (e) {
                // We might want to provide this error information to an error reporting service
                console.warn(e);
            } finally {
                setLoadingComplete(true);
            }
        }

        loadResourcesAndDataAsync();
    }, []);

    return isLoadingComplete;
}
