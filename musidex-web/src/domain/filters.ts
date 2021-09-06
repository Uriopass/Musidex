import React from "react";
import {MusidexMetadata} from "./entity";
import {retain, Setter} from "../components/utils";

type Filters = {
    user?: number;
}

export function newFilters(user?: number): Filters {
    return {
        user: user,
    }
}

// in place
export function applyFilters(filters: Filters, list: number[], metadata: MusidexMetadata) {
    if (filters.user) {
        retain(list, (id) => {
            return metadata.getTags(id)?.has("user_library:" + filters.user) || false;
        })
    }
}

export function findFirst(filters: Filters, list: number[], metadata: MusidexMetadata): number | undefined {
    for (let id of list) {
        if (filters.user && !metadata.getTags(id)?.has("user_library:" + filters.user)) {
            continue;
        }
        return id;
    }
}

export default Filters;

export const FiltersCtx = React.createContext<[Filters, Setter<Filters>]>([newFilters(), _ => _]);
