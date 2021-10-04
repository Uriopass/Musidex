import {useAsyncStorage} from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

export default function useStored<T>(key: string, initialV: T, opts?: { ser: (v: T) => string, deser: (v: string) => T }): [T, (newv: T) => void] {
    const [v, setV] = useState(initialV);
    // todo make saving classes work ?
    const {getItem, setItem, removeItem} = useAsyncStorage(key);

    const setValue = useCallback((newv: T) => {
        setV(newv);
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
    }, [setItem]);

    useEffect(() => {
        getItem().then((vStr) => {
            if (vStr === null) {
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
                setV(opts.deser(vStr));
                return;
            }
            if (typeof initialV === "string") {
                setV(vStr as any as T);
                return;
            }
            setV(JSON.parse(vStr));
        });
    }, []);

    return [v, setValue];
}
