import RNFetchBlob from "react-native-fetch-blob"
import API from "../common/api";
import {MusidexMetadata} from "../common/entity";

export type SyncState = {
    downloaded: Set<number>,
}

/// Returns the path to the song after downloading
export function fetchSong(id: number): Promise<boolean> {
    return RNFetchBlob.config({
        path: getMusicPath(id),
    }).fetch('GET', API.getStreamSrc(id))
        .then(() => true)
        .catch((err) => {
            console.log(err);
            return false;
        })
}

export function syncIter(metadata: MusidexMetadata, syncState: SyncState): Promise<SyncState | null> {
    const x = async () => {
        for (const id of metadata.musics) {
            if (syncState.downloaded.has(id)) {
                continue;
            }
            console.log("fetching song...", id);
            if (!await fetchSong(id)) {
                break
            }
            console.log("fetching ok");
            syncState.downloaded.add(id);
            return {
                ...syncState
            }
        }

        return null;
    };
    return x();
}

export function getMusicPath(id: number): string {
    return RNFetchBlob.fs.dirs.DocumentDir + '/music_' + id + '.mp3';
}

export function newSyncState(metadata: MusidexMetadata): Promise<SyncState> {
    const x = async () => {
        let musics = new Set<number>();
        for (const id of metadata.musics) {
            const x = await RNFetchBlob.fs.exists(getMusicPath(id));
            if (x) {
                musics.add(id);
            }
        }

        return {
            downloaded: musics,
        }
    };
    return x();
}