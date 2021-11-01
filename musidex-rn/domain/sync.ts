import RNFetchBlob from "react-native-fetch-blob"
import API from "../common/api";
import {MusidexMetadata} from "../common/entity";

export type SyncState = {
    downloaded: Set<number>,
    downloaded_thumb: Set<number>,
}

export async function fetchSong(id: number): Promise<boolean> {
    const path = getMusicPath(id);
    if (await RNFetchBlob.fs.exists(path)) {
        return true;
    }
    return RNFetchBlob.config({
        path: path+".part",
    }).fetch('GET', API.getStreamSrc(id))
        .then(() => {
            return RNFetchBlob.fs.mv(path+".part", path)
        })
        .catch((err) => {
            console.log(err);
            return false;
        })
}

export async function fetchThumbnail(thumbTag: string): Promise<boolean> {
    let path = getThumbnailPath(thumbTag);
    if (await RNFetchBlob.fs.exists(path)) {
        return true;
    }
    return RNFetchBlob.config({
        path: path+".part",
    }).fetch('GET', API.getAPIUrl() + "/storage/" + thumbTag)
        .then(() => RNFetchBlob.fs.mv(path+".part", path))
        .catch((err) => {
            console.log(err);
            return false;
        })
}

export function syncIter(metadata: MusidexMetadata, syncState: SyncState): Promise<SyncState | null> {
    const x = async () => {
        let changed = false;
        let iter = 10;
        for (const id of metadata.musics) {
            if (!syncState.downloaded.has(id)) {
                console.log("fetching song...", id);
                if (!await fetchSong(id)) {
                    break
                }
                console.log("fetching song ok");
                syncState.downloaded.add(id);
                changed = true;
                iter -= 1;
                if (iter <= 0) {
                    break;
                }
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
                iter -= 1;
                if (iter <= 0) {
                    break;
                }
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

export function emptySyncState(): SyncState {
    return {
        downloaded_thumb: new Set(),
        downloaded: new Set(),
    }
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