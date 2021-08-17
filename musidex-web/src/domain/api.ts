import {Track} from "./tracklist";
import React from "react";

let apiURL = (process.env.NODE_ENV === "development") ? "http://127.0.0.1:3200" : "http://"+window.location.hostname;

export type Music = {
    id: number;
}

export type Tag = {
    music_id: number;
    key: string;

    text: string | null;
    integer: number | null;
    date: string | null;
    vector: number[] | null;
}

export type Source = {
    music_id: number;
    format: string;
    url: string;
}

type RawMusidexMetadata = {
    musics: Music[];
    tags: Tag[];
    sources: Source[];
}

export class MusidexMetadata {
    musics: Music[];
    tags: Tag[];
    sources: Source[];
    music_tags_idx: Map<number, Map<string, Tag>>;

    constructor(musics: Music[], tags: Tag[], sources: Source[]) {
        this.musics = musics;
        this.tags = tags;
        this.sources = sources;
        this.music_tags_idx = new Map();
        this.musics.forEach((m) => {
            this.music_tags_idx.set(m.id, new Map());
        })

        this.tags.forEach((tag) => {
            this.music_tags_idx.get(tag.music_id)?.set(tag.key, tag);
        })
    }
}

export const MetadataCtx = React.createContext(emptyMetadata());

export function emptyMetadata(): MusidexMetadata {
    return new MusidexMetadata([], [], []);
}

export function buildTrack(id: number, metadata: MusidexMetadata): Track | null {
    let tags = metadata.music_tags_idx.get(id);
    if (tags === undefined) return null;
    return {
        id: id,
        tags: tags,
    }
}

export const API = {
    async getMetadata(): Promise<MusidexMetadata | null> {
        return fetchJson(apiURL + "/api/metadata").then((v: RawMusidexMetadata) => {
            if(v == null) return null;
            return new MusidexMetadata(v.musics, v.tags, v.sources);
        })
    },

    getStreamSrc(id: number): string {
        return apiURL + "/api/stream/"+id
    }
}

async function fetchJson(url: string): Promise<any | null> {
    try {
        let v = await fetch(url);
        if (v.status !== 200) {
            console.log("failed fetching " + url);
            return null;
        }
        return await v.json();
    } catch (e) {
        return null;
    }
}

export default API;
