import {useAsyncStorage} from "@react-native-async-storage/async-storage";
import {MutableRefObject, RefObject, useCallback, useEffect, useRef, useState} from "react";

export default function useStored<T>(key: string, initialV: T, opts?: { ser: (v: T) => string, deser: (v: string) => T }): [T, (newv: T) => void, boolean] {
    const [[v, initialLoad], setV] = useState([initialV, false]);
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


export function useStoredRef<T>(key: string, initialV: T): [RefObject<T>, (mutate: (v: MutableRefObject<T>) => void) => void, boolean] {
    const v = useRef<T>(initialV);
    const [initialLoad, setInitialLoad] = useState(false);
    const {getItem, setItem, removeItem} = useAsyncStorage(key);

    const setValue = useCallback((mutate: (v: MutableRefObject<T>) => void) => {
        mutate(v);
        if (v.current === undefined) {
            removeItem();
            return;
        }
        if (typeof (v.current) === "string") {
            setItem(v.current);
            return;
        }
        setItem(JSON.stringify(v.current));
    }, [setItem, removeItem, initialLoad]);

    useEffect(() => {
        getItem().then((vStr) => {
            setInitialLoad(true);
            if (vStr === null) {
                return;
            }
            if (typeof initialV === "string") {
                v.current = vStr as any as T;
                return;
            }
            v.current = JSON.parse(vStr);
        });
    }, []);

    return [v, setValue, initialLoad];
}
