import {getTags, MusidexMetadata} from "./entity";
import {retain} from "./utils";
import Tracklist from "./tracklist";
import {useMemo} from "react";
import Fuse from "fuse.js";

type Filters = {
    user_only: boolean;
}

export type SortByKind = { kind: "similarity" } | { kind: "creation_time" } | { kind: "tag", value: string }
export type SortBy = { kind: SortByKind, descending: boolean }

export function newFilters(): Filters {
    return {
        user_only: true,
    }
}

// in place
export function applyFilters(filters: Filters, list: number[], metadata: MusidexMetadata, curUser?: number) {
    let k = "user_library:" + curUser;
    if (filters.user_only) {
        retain(list, (id) => {
            return getTags(metadata, id)?.has(k) || false;
        })
    }
}

export function findFirst(filters: Filters, list: number[], metadata: MusidexMetadata, curUser: number | undefined): number | undefined {
    let k = "user_library:" + curUser;
    for (let id of list) {
        if (filters.user_only && !getTags(metadata, id)?.has(k)) {
            continue;
        }
        return id;
    }
}

const fuseOptions = {
    includeScore: true,
    keys: ['title', 'artist'],
    threshold: 0.4,
}

export function useMusicSelect(metadata: MusidexMetadata, searchQry: string, sortBy: SortBy, list: Tracklist, filters: Filters, curUser: number | undefined) {
    const curTrack: number | undefined = list.last_played[list.last_played.length - 1];

    const fuse = useMemo(() => {
        return new Fuse(metadata.fuse_document, fuseOptions)
    }, [metadata]);

    const qryFilter = useMemo(() => {
        if (searchQry === "") {
            return [];
        }
        return fuse.search(searchQry)
    }, [searchQry, fuse])

    let toShow: number[];
    if (searchQry !== "" && fuse !== undefined) {
        toShow = qryFilter.map((v: any) => v.item.id);
    } else {
        switch (sortBy.kind.kind) {
            case "similarity":
                toShow = list.best_tracks.slice();
                if (curTrack === undefined) {
                    toShow = metadata.musics.slice();
                    toShow.reverse();
                }
                break;
            case "creation_time":
                toShow = metadata.musics.slice();
                toShow.reverse();
                break;
            case "tag":
                let v = sortBy.kind.value;
                toShow = metadata.musics.slice();
                toShow.sort((a, b) => {
                    return (getTags(metadata, a)?.get(v)?.text || "").localeCompare(getTags(metadata, b)?.get(v)?.text || "")
                })
                break;
        }
        if (!sortBy.descending) {
            toShow.reverse();
        }
    }

    applyFilters(filters, toShow, metadata, curUser);
    return toShow;
}

export function sortby_kind_eq(a: SortByKind, b: SortByKind) {
    if (a.kind === "tag" && b.kind === "tag") {
        return a.value === b.value
    }
    return a.kind === b.kind
}

export default Filters;
