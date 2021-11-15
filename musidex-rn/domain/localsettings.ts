export type LocalSettings = {
    downloadMusicLocally: boolean,
    downloadUsers: number[],
    iosEnableJumpForward: boolean,
}

export function newLocalSettings(): LocalSettings {
    return {
        downloadMusicLocally: false,
        downloadUsers: [],
        iosEnableJumpForward: false,
    }
}