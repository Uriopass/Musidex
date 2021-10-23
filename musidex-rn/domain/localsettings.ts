export type LocalSettings = {
    downloadMusicLocally: boolean,
}

export function newLocalSettings(): LocalSettings {
    return {
        downloadMusicLocally: false,
    }
}