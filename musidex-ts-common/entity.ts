import {retain} from "./utils";
import {RawMusidexMetadata} from "./api";

export interface Tag {
    music_id: number;
    key: string;

    text?: string;
    integer?: number;
    date?: string;
    vector?: number[];
}

export type User = {
    id: number;
    name: string;
}

export type Tags = Map<string, Tag>;
export type Vector = {
    v: number[],
    mag: number,
};

export type IndexedMusic = {
    id: number;
    title: string;
    artist: string;
}

export type MusidexMetadata = {
    raw: RawMusidexMetadata,
    musics: number[];
    tags: Tag[];
    users: User[];
    settings_l: [string, string][];
    music_tags_idx: Map<number, Tags>;
    settings: Map<string, string>;
    embeddings: Map<number, Vector>;
    fuse_document: IndexedMusic[];
}

export function getTags(meta: MusidexMetadata, id: number | undefined): Tags | undefined {
    if (id === undefined) {
        return undefined;
    }
    return meta.music_tags_idx.get(id);
}

export function firstUser(meta: MusidexMetadata): number | undefined {
    return meta.users[0]?.id;
}

export function newMetadata(raw: RawMusidexMetadata, previous?: MusidexMetadata): MusidexMetadata {
    let meta: MusidexMetadata = {
        raw: raw,
        musics: raw.musics,
        users: raw.users,
        settings_l: raw.settings,
        settings: new Map(raw.settings),
        music_tags_idx: new Map(),
        embeddings: new Map(),
        fuse_document: [],
        tags: raw.tags || previous?.tags || [],
    };

    if (raw.patches) {
        for (let patch of raw.patches) {
            switch (patch.kind) {
                case "add":
                    meta.tags.push(patch.tag);
                    break;
                case "remove":
                    let id = patch.tag.music_id;
                    let k = patch.tag.key;
                    retain(meta.tags, (t) => !(t.music_id === id && t.key === k));
                    break;
                case "update":
                    for (let i = 0; i < meta.tags.length; i++) {
                        let v = meta.tags[i];
                        // @ts-ignore
                        if (v.music_id === patch.tag.music_id && v.key === patch.tag.key) {
                            meta.tags[i] = patch.tag;
                        }
                    }
                    break;
            }
        }
    }

    meta.musics.forEach((m) => {
        meta.music_tags_idx.set(m, new Map());
    });

    meta.tags.forEach((tag) => {
        meta.music_tags_idx.get(tag.music_id)?.set(tag.key, tag);
        if (tag.key === "embedding" && tag.vector !== undefined) {
            let mag = 0;
            for (let v of tag.vector) {
                mag += v * v;
            }
            mag = Math.sqrt(mag);
            meta.embeddings.set(tag.music_id, {v: tag.vector, mag: mag});
        }
    });

    for (let [id, tags] of meta.music_tags_idx.entries()) {
        meta.fuse_document.push({
            id: id,
            title: tags.get("title")?.text || "",
            artist: tags.get("artist")?.text || "",
        });
    }

    return meta;
}

export function emptyMetadata(): MusidexMetadata {
    return newMetadata({musics: [], users: [], tags: [], settings: []});
}

export function canPlay(tags: Tags): boolean {
    for (let key of tags.keys()) {
        if (key.startsWith("local_")) {
            return true;
        }
    }
    return false;
}
