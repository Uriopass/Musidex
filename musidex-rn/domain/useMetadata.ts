import {emptyMetadata, makeRawMeta, MusidexMetadata, newMetadata} from "../common/entity";
import RNFetchBlob from "rn-fetch-blob";
import {useCallback, useEffect, useState} from "react";
import {RawMusidexMetadata} from "../common/api";

const metapath = RNFetchBlob.fs.dirs.DocumentDir + "/metadata.json";

export default function useMetadata(): [MusidexMetadata, (newv: MusidexMetadata) => void, boolean] {
    const [localMeta, setLocalMeta] = useState(emptyMetadata);
    const [loadedFile, setLoadedFile] = useState(false);

    useEffect(() => {
        RNFetchBlob.fs.readFile(metapath, "utf8").then((s: string) => {
            const raw: RawMusidexMetadata = JSON.parse(s);
            setLocalMeta(newMetadata(raw));
        }).catch(() => {}).finally(() => {
            setLoadedFile(true);
        });
    }, []);

    const setMeta = useCallback((newmeta: MusidexMetadata) => {
        setLocalMeta(newmeta);
        RNFetchBlob.fs.writeFile(metapath, JSON.stringify(makeRawMeta(newmeta)), "utf8");
    }, [setLocalMeta]);

    return [localMeta, setMeta, loadedFile];
}