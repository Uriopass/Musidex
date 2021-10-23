import RNFetchBlob from "react-native-fetch-blob"
import API from "../common/api";
import {MusidexMetadata} from "../common/entity";

export type SyncState = {
    downloaded: Set<number>,
    downloaded_thumb: Set<number>,
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

/// Returns the path to the song after downloading
export function fetchThumbnail(thumbTag: string): Promise<boolean> {
    return RNFetchBlob.config({
        path: getThumbnailPath(thumbTag),
    }).fetch('GET', API.getAPIUrl() + "/storage/" + thumbTag)
        .then(() => true)
        .catch((err) => {
            console.log(err);
            return false;
        })
}

export function syncIter(metadata: MusidexMetadata, syncState: SyncState): Promise<SyncState | null> {
    const x = async () => {
        let changed = false;
        for (const id of metadata.musics) {
            if (!syncState.downloaded.has(id)) {
                console.log("fetching song...", id);
                if (!await fetchSong(id)) {
                    break
                }
                console.log("fetching song ok");
                syncState.downloaded.add(id);
                changed = true;
                break;
            }
            if (!syncState.downloaded_thumb.has(id)) {
                const thumb = metadata.music_tags_idx.get(id)?.get("compressed_thumbnail")?.text;
                if (thumb === undefined || thumb === "") {
                    continue;
                }
                console.log("fetching thumb...", thumb);
                if (!await fetchThumbnail(thumb)) {
                    break
                }
                console.log("fetching thumb ok");
                syncState.downloaded_thumb.add(id);
                changed = true;
                break;
            }
        }

        if (changed) {
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

export function getThumbnailPath(thumbTag: string): string {
    return RNFetchBlob.fs.dirs.DocumentDir + '/thumbnail_' + thumbTag;
}

export function newSyncState(metadata: MusidexMetadata): Promise<SyncState> {
    const x: () => Promise<SyncState> = async () => {
        let musics = new Set<number>();
        let thumbs = new Set<number>();
        for (const id of metadata.musics) {
            const hasMusic = await RNFetchBlob.fs.exists(getMusicPath(id));
            if (hasMusic) {
                musics.add(id);
            }
            const thumb = metadata.music_tags_idx.get(id)?.get("compressed_thumbnail")?.text;
            if (thumb === undefined || thumb === "") {
                continue;
            }
            const hasThumb = await RNFetchBlob.fs.exists(getThumbnailPath(thumb));
            if (hasThumb) {
                thumbs.add(id);
            }
        }

        return {
            downloaded: musics,
            downloaded_thumb: thumbs,
        }
    };
    return x();
}