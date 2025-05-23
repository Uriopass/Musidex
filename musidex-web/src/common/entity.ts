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
export type Vector = number[];

export type IndexedMusic = {
    id: number;
    title: string;
    artist: string;
    usertags: string;
}

export type MusidexMetadata = {
    musics: number[];
    tags: Tag[];
    users: User[];
    settings_l: [string, string][];
    music_tags_idx: Map<number, Tags>;
    settings: Map<string, string>;
    embeddings: Map<number, Vector>;
    user_songs: Map<number, number[]>;
    user_names: Map<number, string>;
    playable: Set<number>;
    fuse_document: IndexedMusic[];
    unique_user_tags: Set<string>;
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

export function makeRawMeta(meta: MusidexMetadata): RawMusidexMetadata {
    return {
        musics: meta.musics,
        users: meta.users,
        settings: meta.settings_l,
        tags: meta.tags,
    };
}

export function newMetadata(raw: RawMusidexMetadata, previous?: MusidexMetadata): MusidexMetadata {
    let meta: MusidexMetadata = {
        musics: raw.musics,
        users: raw.users,
        settings_l: raw.settings,
        settings: new Map(raw.settings),
        music_tags_idx: new Map(),
        embeddings: new Map(),
        user_songs: new Map(),
        user_names: new Map(raw.users.map((u) => [u.id, u.name])),
        fuse_document: [],
        tags: raw.tags || previous?.tags || [],
        playable: new Set(),
        unique_user_tags: new Set(),
    };

    if (raw.patches) {
        for (let patch of raw.patches) {
            console.log(patch);
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
            meta.embeddings.set(tag.music_id, tag.vector);
        }
        if (tag.key.startsWith("local_")) {
            meta.playable.add(tag.music_id);
        }
        if (tag.key.startsWith("user_library:")) {
            let v = tag.key.split("user_library:")[1];
            if (v) {
                let uid = parseInt(v);
                if (!isNaN(uid)) {
                    let v = meta.user_songs.get(uid);
                    if (v === undefined) {
                        meta.user_songs.set(uid, [tag.music_id]);
                    } else {
                        v.push(tag.music_id);
                    }
                }
            }
        }
    });

    for (let [id, songs] of meta.user_songs.entries()) {
        let key = `user_library:${id}`;
        songs.sort((a, b) => {
            let at = meta.music_tags_idx.get(a)?.get(key)?.integer || a;
            let bt = meta.music_tags_idx.get(b)?.get(key)?.integer || b;
            return bt - at;
        });
    }

    for (let [id, tags] of meta.music_tags_idx.entries()) {
        let user_tags = [];

        for (let key of tags.keys()) {
            if (key.startsWith("user_tag:")) {
                let tag = key.substring("user_tag:".length);
                user_tags.push(tag);
                meta.unique_user_tags.add(tag);
            }
        }

        meta.fuse_document.push({
            id: id,
            title: tags.get("title")?.text || "",
            artist: tags.get("artist")?.text || "",
            usertags: user_tags.join(" "),
        });
    }

    return meta;
}

export function emptyMetadata(): MusidexMetadata {
    return newMetadata({musics: [], users: [], tags: [], settings: []});
}
