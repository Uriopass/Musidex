export type LocalSettings = {
    downloadMusicLocally: boolean,
    downloadUsers: number[],
}

export function newLocalSettings(): LocalSettings {
    return {
        downloadMusicLocally: false,
        downloadUsers: [],
    }
}