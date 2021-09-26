type Trackplayer = {
    current: number | undefined,
    duration: number | undefined,
};

export function newTrackPlayer(): Trackplayer {
    return {
        current: undefined,
        duration: undefined,
    }
}

export default Trackplayer;