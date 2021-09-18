import {RawMusidexMetadata} from "../common/api";
import {emptyMetadata, MusidexMetadata} from "../common/entity";
import useLocalStorage from "use-local-storage";
import React, {useCallback, useState} from "react";

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

export function useMetadata(): [MusidexMetadata, (meta: MusidexMetadata, metastr: string) => void] {
    let [metaStored, setMetaStored] = useLocalStorage("metadata", "", {serializer: x => x || "", parser: x => x});

    let [meta, setMeta] = useState<MusidexMetadata>(() => {
        if (metaStored === "") {
            return emptyMetadata();
        }
        let v: RawMusidexMetadata = JSON.parse(metaStored);
        return new MusidexMetadata(v);
    });

    let f = useCallback((meta: MusidexMetadata, metaStr: string) => {
        setMeta(meta);
        if (metaStr.length > 4000000) {
            console.log("too much metadata, not storing in local storage");
            setMetaStored("");
            return;
        }
        setMetaStored(metaStr);
    }, [setMeta, setMetaStored]);

    return [meta, f];
}