import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";
import Tracklist, {emptyTracklist, NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {newTrackPlayer} from "../domain/trackplayer";
import {Dispatch, Setter} from "../common/utils";
import Filters, {newFilters} from "../common/filters";

export default {
    Metadata: React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
        return;
    }]),
    Trackplayer: React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]),
    Controls: React.createContext<[NextTrackCallback, PrevTrackCallback]>([_ => {}, () => {}]),
    Filters: React.createContext<[Filters, Setter<Filters>]>([newFilters(), _ => _]),
    Tracklist: React.createContext<Tracklist>(emptyTracklist())
}
