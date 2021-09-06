import React from "react";
import {MusidexMetadata} from "./entity";
import {retain, Setter} from "../components/utils";

type Filters = {
    user_only: boolean;
}

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
            return metadata.getTags(id)?.has(k) || false;
        })
    }
}

export function findFirst(filters: Filters, list: number[], metadata: MusidexMetadata, curUser: number | undefined): number | undefined {
    let k = "user_library:" + curUser;
    for (let id of list) {
        if (filters.user_only && !metadata.getTags(id)?.has(k)) {
            continue;
        }
        return id;
    }
}

export default Filters;

export const FiltersCtx = React.createContext<[Filters, Setter<Filters>]>([newFilters(), _ => _]);
