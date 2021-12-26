import {RawMusidexMetadata} from "../common/api";
import {emptyMetadata, MusidexMetadata, newMetadata} from "../common/entity";
import React, {useCallback, useState} from "react";
import {useIndexedStorage} from "../components/utils";

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

export function useMetadata(): [MusidexMetadata, (meta: MusidexMetadata, metastr: string) => void, boolean] {
    let [metaStored, setMetaStored, loaded] = useIndexedStorage("metadata", "");

    let [meta, setMeta] = useState<MusidexMetadata>(emptyMetadata());
    let [firstLoad, setFirstLoad] = useState(false);

    let f = useCallback((meta: MusidexMetadata, metaStr: string) => {
        setMeta(meta);
        setMetaStored(metaStr);
    }, [setMeta, setMetaStored]);

    if (!loaded) {
        return [meta, () => {}, false];
    }

    if(!firstLoad) {
        setFirstLoad(true);
        if (metaStored !== "" && metaStored !== null) {
            let v: RawMusidexMetadata = JSON.parse(metaStored);
            setMeta(newMetadata(v));
        }
        return [meta, () => {}, false];
    }

    return [meta, f, true];
}