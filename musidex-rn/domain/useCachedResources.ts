import * as React from 'react';
import TrackPlayer, {AppKilledPlaybackBehavior, Capability, IOSCategory,} from 'react-native-track-player';
import {Platform} from "react-native";

export const DEFAULT_CAPABILITIES = [
    Capability.Play,
    Capability.Pause,
    Capability.SeekTo,
    Capability.SkipToNext,
    Capability.SkipToPrevious,
];

export default function useCachedResources() {
    const [isLoadingComplete, setLoadingComplete] = React.useState(false);

    // Load any resources or data that we need prior to rendering the app
    React.useEffect(() => {
        async function loadResourcesAndDataAsync() {
            try {
                await TrackPlayer.setupPlayer({iosCategory: IOSCategory.Playback, minBuffer: 5, maxBuffer: 10});

                let cap = DEFAULT_CAPABILITIES;

                if (Platform.OS === "android") {
                    cap = cap.concat([Capability.JumpForward]);
                }

                await TrackPlayer.updateOptions({
                    android: {
                        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                    },
                    // Media controls capabilities
                    capabilities: cap,

                    // Capabilities that will show up when the notification is in the compact form on Android
                    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.JumpForward],
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
