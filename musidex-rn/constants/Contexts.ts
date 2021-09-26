import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";
import {TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {newTrackPlayer} from "../domain/trackplayer";
import {Dispatch} from "../common/utils";

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

export const TrackplayerCtx = React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);

const Contexts = {};
export default Contexts;