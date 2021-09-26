import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";
import {NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {newTrackPlayer} from "../domain/trackplayer";
import {Dispatch} from "../common/utils";

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

export const TrackplayerCtx = React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);

export const ControlsCtx = React.createContext<[NextTrackCallback, PrevTrackCallback]>([_ => {}, () => {}]);

const Contexts = {};
export default Contexts;