import {emptyMetadata, MusidexMetadata, newMetadata} from "../common/entity";
import RNFetchBlob from "rn-fetch-blob";
import {useCallback, useEffect, useState} from "react";
import {RawMusidexMetadata} from "../common/api";

const curVersion = 1;
const metapath = RNFetchBlob.fs.dirs.DocumentDir + "/metadata.json";

export default function useMetadata(): [MusidexMetadata, (newv: MusidexMetadata) => void, boolean] {
    const [localMeta, setLocalMeta] = useState(emptyMetadata);
    const [loadedFile, setLoadedFile] = useState(false);

    useEffect(() => {
        RNFetchBlob.fs.readFile(metapath, "utf8").then((s: string) => {
            const raw: RawMusidexMetadata = JSON.parse(s);
            if (raw.version !== curVersion) {
                return;
            }
            setLocalMeta(newMetadata(raw));
        }).catch(() => {}).finally(() => {
            setLoadedFile(true);
        });
    }, []);

    const setMeta = useCallback((newmeta: MusidexMetadata) => {
        setLocalMeta(newmeta);
        newmeta.raw.version = curVersion;
        RNFetchBlob.fs.writeFile(metapath, JSON.stringify(newmeta.raw), "utf8");
    }, [setLocalMeta]);

    return [localMeta, setMeta, loadedFile];
}