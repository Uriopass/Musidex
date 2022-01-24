import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";
import Tracklist, {emptyTracklist, NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {newTrackPlayer} from "../domain/trackplayer";
import {Dispatch} from "../common/utils";
import {emptyMusicSelect, MusicSelect, newSearchForm, SearchForm} from "../common/filters";
import {emptySyncState, SyncState} from "./sync";
import {LocalSettings, newLocalSettings} from "./localsettings";

export default {
    Metadata: React.createContext<[MusidexMetadata,() => Promise<void>]>([emptyMetadata(), async () => {}]),
    SyncState: React.createContext<SyncState>(emptySyncState()),
    Trackplayer: React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer({current: null}), _ => _]),
    Controls: React.createContext<[NextTrackCallback, PrevTrackCallback,() => void]>([_ => {}, () => {}, () => {}]),
    SearchForm: React.createContext<[SearchForm,(newv: SearchForm) => void]>([newSearchForm(undefined), _ => _]),
    LocalSettings: React.createContext<[LocalSettings,(newv: LocalSettings) => void]>([newLocalSettings(), _ => _]),
    SelectedMusics: React.createContext<MusicSelect>(emptyMusicSelect()),
    Tracklist: React.createContext<Tracklist>(emptyTracklist()),
    User: React.createContext<[number | undefined,(newv: number | undefined) => void]>([0, _ => _]),
    APIUrl: React.createContext<[string,(newv: string) => void]>(["", _ => _]),
};
