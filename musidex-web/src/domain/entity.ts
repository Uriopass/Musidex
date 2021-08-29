import React from "react";

export interface Tag {
    music_id: number;
    key: string;

    text: string | null;
    integer: number | null;
    date: string | null;
    vector: number[] | null;
}

export type Tags = Map<string, Tag>;

export class MusidexMetadata {
    musics: number[];
    tags: Tag[];
    music_tags_idx: Map<number, Tags>;

    constructor(musics: number[], tags: Tag[]) {
        this.musics = musics;
        this.tags = tags;
        this.music_tags_idx = new Map();

        this.musics.forEach((m) => {
            this.music_tags_idx.set(m, new Map());
        })

        this.tags.forEach((tag) => {
            this.music_tags_idx.get(tag.music_id)?.set(tag.key, tag);
        })
    }
}

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

export function emptyMetadata(): MusidexMetadata {
    return new MusidexMetadata([], []);
}

export function canPlay(tags: Tags): boolean {
    for (let key of tags.keys()) {
        if (key.startsWith("local_")) {
            return true;
        }
    }
    return false;
}