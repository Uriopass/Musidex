import {useAsyncStorage} from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

export default function useStored<T>(key: string, initialV: T, opts?: { ser: (v: T) => string, deser: (v: string) => T }): [T, (newv: T) => void, boolean] {
    const [[v, initialLoad], setV] = useState([initialV, false]);
    // todo make saving classes work ?
    const {getItem, setItem, removeItem} = useAsyncStorage(key);

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
        getItem().then((vStr) => {
            if (vStr === null) {
                setV([initialV, true]);
                if (initialV === undefined) {
                    removeItem();
                    return;
                }
                if (opts) {
                    setItem(opts.ser(initialV));
                    return;
                }
                if (typeof (initialV) === "string") {
                    setItem(initialV);
                    return;
                }
                setItem(JSON.stringify(initialV));
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
    }, []);

    return [v, setValue, initialLoad];
}
