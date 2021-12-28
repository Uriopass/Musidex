import RNFetchBlob from "rn-fetch-blob"
import API from "../common/api";
import {MusidexMetadata, Tags} from "../common/entity";
import {LocalSettings} from "./localsettings";

export type SyncState = {
    files: Set<String>,
    loaded: boolean,
}

export async function fetchSong(metadata: MusidexMetadata, id: number): Promise<boolean> {
    const path = getMusicPath(metadata.music_tags_idx.get(id));
    if (path === undefined || path === "") {
        console.log("couldn't get path");
        return new Promise((resolve => resolve(false)));
    }
    if (await RNFetchBlob.fs.exists(path)) {
        return new Promise((resolve => resolve(true)));
    }
    return RNFetchBlob.config({
        path: path+".part",
    }).fetch('GET', API.getStreamSrc(id))
        .catch((err) => {
            console.log("error fetching", err);
            return false;
        })
        .then(() => RNFetchBlob.fs.mv(path+".part", path))
        .then(() => true)
        .catch((err) => {
            console.log("error mving", err);
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
        .then(() => true)
        .catch((err) => {
            console.log(err);
            return false;
        })
}

export function syncIter(metadata: MusidexMetadata, syncState: SyncState, musicsToDownload: number[]): Promise<boolean> {
    const x = async () => {
        let changed = false;
        for (const id of musicsToDownload) {
            const fn = getMusicFilename(metadata.music_tags_idx.get(id));
            if (fn && !syncState.files.has(fn)) {
                console.log("fetching song...", id);
                if (!await fetchSong(metadata, id)) {
                    continue
                }
                console.log("fetching song ok");
                syncState.files.add(fn);
                changed = true;
                break;
            }
            const thumb = metadata.music_tags_idx.get(id)?.get("compressed_thumbnail")?.text;
            if (thumb === undefined || thumb === "") {
                continue;
            }
            const fnt = getThumbnailFilename(thumb);
            if (!syncState.files.has(fnt)) {
                console.log("fetching thumb...", thumb);
                if (!await fetchThumbnail(thumb)) {
                    break
                }
                console.log("fetching thumb ok");
                syncState.files.add(fnt);
                changed = true;
                break;
            }
        }
        return changed;
    };
    return x();
}

export function getMusicFilename(tags: Tags | undefined): string | undefined {
    if (!tags?.get("local_mp3")?.text) {
        return undefined;
    }
    const tag = tags?.get("youtube_video_id")?.text;
    if (tag && tag !== "") {
        return 'music_' + tag + '.mp3';
    }
    return undefined;
}

export function getMusicPath(tags: Tags | undefined): string | undefined {
    const fn = getMusicFilename(tags);
    if (fn) {
        return RNFetchBlob.fs.dirs.DocumentDir + '/' + fn;
    }
    return undefined;
}

export function getThumbnailFilename(thumbTag: string): string {
    return 'thumbnail_' + thumbTag;
}

export function getThumbnailPath(thumbTag: string): string {
    return RNFetchBlob.fs.dirs.DocumentDir + '/' + getThumbnailFilename(thumbTag);
}

export function isMusicSynced(syncState: SyncState, metadata: MusidexMetadata, id: number): boolean {
    const v = getMusicFilename(metadata.music_tags_idx.get(id));
    if (!v) {
        return false;
    }
    return syncState.files.has(v);
}

export function isThumbSynced(syncState: SyncState, metadata: MusidexMetadata, id: number): boolean {
    return syncState.files.has(getThumbnailFilename(metadata.music_tags_idx.get(id)?.get("compressed_thumbnail")?.text || "grrrr") || "grrr");
}

export function emptySyncState(): SyncState {
    return {
        files: new Set(),
        loaded: false,
    }
}

export function newSyncState(): Promise<SyncState> {
    const x: () => Promise<SyncState> = async () => {
        return {
            files: new Set(await RNFetchBlob.fs.ls(RNFetchBlob.fs.dirs.DocumentDir)),
            loaded: true,
        }
    };
    return x();
}