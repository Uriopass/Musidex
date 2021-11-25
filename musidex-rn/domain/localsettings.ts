export type LocalSettings = {
    downloadMusicLocally: boolean,
    downloadUsers: number[],
    iosEnableJumpForward: boolean,
    favorites: number[],
}

export function newLocalSettings(): LocalSettings {
    return {
        downloadMusicLocally: false,
        downloadUsers: [],
        iosEnableJumpForward: false,
        favorites: [],
    }
}