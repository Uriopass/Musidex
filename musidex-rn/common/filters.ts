import {getTags, MusidexMetadata} from "./entity";
import {prng, retain} from "./utils";
import Tracklist from "./tracklist";
import {useMemo} from "react";
import Fuse from "fuse.js";

export type SearchForm = {
    filters: Filters;
    sort: SortBy;
    similarityParams: SimilarityParams,
}

export type SimilarityParams = {
    temperature: number,
}

export type Filters = {
    user: number | undefined;
    searchQry: string;
}

export type SortByKind =
    { kind: "similarity" }
    | { kind: "creation_time" }
    | { kind: "tag", value: string }
    | { kind: "random" }
export type SortBy = { kind: SortByKind, descending: boolean }

export function newSearchForm(user: number | undefined): SearchForm {
    return {
        filters: {
            user: user,
            searchQry: "",
        },
        sort: {
            kind: {kind: "similarity"},
            descending: true
        },
        similarityParams: {
            temperature: 0.0,
        }
    };
}

// in place
export function applyFilters(filters: Filters, list: number[], metadata: MusidexMetadata) {
    if (filters.user !== undefined) {
        let k = "user_library:" + filters.user;
        retain(list, (id) => {
            return getTags(metadata, id)?.has(k) || false;
        });
    }
}

const fuseOptions = {
    includeScore: true,
    keys: ['title', 'artist'],
    threshold: 0.4,
};

export const seed = Math.floor(Math.random() * 10000000);

export function useMusicSelect(metadata: MusidexMetadata, search: SearchForm, list: Tracklist): number[] {
    const curTrack: number | undefined = list.last_played[list.last_played.length - 1];
    const sortBy = search.sort;
    const searchQry = search.filters.searchQry;
    const isRegex = searchQry.charAt(0) === '/';
    const scoremap = list.score_map;

    const temp = search.similarityParams.temperature;
    const best_tracks = useMemo(() => {
        const l = metadata.musics.slice();
        l.sort((a, b) => {
            const va = prng(seed + a)();
            const vb = prng(seed + b)();
            const vc = (va - vb) * temp;
            return (scoremap.get(b) ?? -100000) - (scoremap.get(a) ?? -100000) + vc;
        });
        return l;
    }, [metadata, scoremap, temp]);

    const fuse = useMemo(() => {
        return new Fuse(metadata.fuse_document, fuseOptions);
    }, [metadata]);

    const qryFilter = useMemo(() => {
        if (searchQry === "" || fuse === undefined || isRegex) {
            return [];
        }
        return fuse.search(searchQry).map((v: any) => v.item.id);
    }, [searchQry, fuse, isRegex]);

    const regexFilter = useMemo(() => {
        if (searchQry === "" || !isRegex) {
            return [];
        }
        const matches = [];
        try {
            const regex = new RegExp(searchQry.substr(1), 'i');
            for (let v of metadata.fuse_document) {
                if (regex.test(v.artist) || regex.test(v.title)) {
                    matches.push(v.id);
                }
            }
        } catch {}
        return matches;
    }, [isRegex, searchQry, metadata])

    return useMemo(() => {
        let toShow: number[];
        if (searchQry !== "") {
            toShow = isRegex ? regexFilter : qryFilter
        } else {
            switch (sortBy.kind.kind) {
                case "similarity":
                    toShow = best_tracks.slice();
                    if (curTrack === undefined) {
                        toShow = metadata.musics.slice();
                        toShow.reverse();
                    }
                    applyFilters(search.filters, toShow, metadata);
                    break;
                case "creation_time":
                    toShow = metadata.musics.slice();
                    applyFilters(search.filters, toShow, metadata);
                    toShow.reverse();
                    break;
                case "tag":
                    const v = sortBy.kind.value;
                    toShow = metadata.musics.slice();
                    applyFilters(search.filters, toShow, metadata);
                    toShow.sort((a, b) => {
                        return (getTags(metadata, a)?.get(v)?.text || "").localeCompare(getTags(metadata, b)?.get(v)?.text || "");
                    });
                    break;
                case "random":
                    toShow = metadata.musics.slice();
                    applyFilters(search.filters, toShow, metadata);
                    toShow.sort((a, b) => {
                        return prng(seed + a)() - prng(seed + b)();
                    });
                    break;
            }
            if (!sortBy.descending) {
                toShow.reverse();
            }
        }

        return toShow;
        /* eslint-disable */
    }, [metadata, search, sortBy, list, best_tracks]);
    /* eslint-enable */
}

export function isSimilarity(sf: SearchForm): boolean {
    return sf.sort.kind.kind === "similarity" && sf.filters.searchQry === ""
}

export function sortby_kind_eq(a: SortByKind, b: SortByKind) {
    if (a.kind === "tag" && b.kind === "tag") {
        return a.value === b.value;
    }
    return a.kind === b.kind;
}

export default Filters;
