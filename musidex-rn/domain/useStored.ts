import {useAsyncStorage} from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

export default function useStored<T>(key: string, curVersion: number, initialV: T, opts?: { ser: (v: T) => string, deser: (v: string) => T }): [T, (newv: T) => void, boolean] {
    const [[v, initialLoad], setV] = useState([initialV, false]);
    const [version, setVersion] = useState<number | undefined>(undefined);
    // todo make saving classes work ?
    const {getItem, setItem, removeItem} = useAsyncStorage(key);
    const {getItem: getItemVersion, setItem: setItemVersion} = useAsyncStorage(key + "__version_inner");

    useEffect(() => {
        getItemVersion().then((v) => {
            if (v === null) {
                setVersion(-1);
                return;
            }
            setVersion(parseInt(v));
        })
    }, [])

    const setValue = useCallback((newv: T) => {
        setV([newv, initialLoad]);
        if (newv === undefined) {
            removeItem();
            return;
        }
        if (opts) {
            setItem(opts.ser(newv));
            return;
        }
        if (typeof (newv) === "string") {
            setItem(newv);
            return;
        }
        setItem(JSON.stringify(newv));
    }, [setItem, removeItem, opts, initialLoad]);

    useEffect(() => {
        if (version === undefined) {
            return;
        }
        if (version !== curVersion) {
            setV([initialV, true]);
            removeItem().then(() => setItemVersion("" + curVersion)).then(() => setVersion(curVersion));
            return;
        }
        if(initialLoad) {
            return;
        }
        getItem().then((vStr) => {
            if (vStr === null) {
                setV([initialV, true]);
                return;
            }
            if (opts) {
                setV([opts.deser(vStr), true]);
                return;
            }
            if (typeof initialV === "string") {
                setV([vStr as any as T, true]);
                return;
            }
            setV([JSON.parse(vStr), true]);
        });
    }, [version]);

    return [v, setValue, initialLoad && version === curVersion];
}
