import * as React from 'react';
import TrackPlayer, {Capability, IOSCategory} from 'react-native-track-player';

export default function useCachedResources() {
    const [isLoadingComplete, setLoadingComplete] = React.useState(false);

    // Load any resources or data that we need prior to rendering the app
    React.useEffect(() => {
        async function loadResourcesAndDataAsync() {
            try {
                await TrackPlayer.setupPlayer({iosCategory: IOSCategory.Playback, waitForBuffer: true, minBuffer: 5});

                await TrackPlayer.updateOptions({
                    stopWithApp: true,
                    // Media controls capabilities
                    capabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.SkipToNext,
                        Capability.SkipToPrevious,
                        Capability.JumpForward,
                    ],

                    // Capabilities that will show up when the notification is in the compact form on Android
                    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
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
