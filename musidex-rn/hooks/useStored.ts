import {useAsyncStorage} from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

export default function useStored<T>(key: string, initialV: T): [T, (newv: T) => void] {
    const [v, setV] = useState(initialV);
    const {getItem, setItem} = useAsyncStorage(key);

    const setValue = useCallback((newv: T) => {
        setV(newv);
        if (typeof (newv) === "string") {
            setItem(newv);
            return;
        }
        setItem(JSON.stringify(newv));
    }, [setItem])

    useEffect(() => {
        getItem().then((vStr) => {
            if (vStr === null) {
                if (typeof (initialV) === "string") {
                    setItem(initialV);
                    return;
                }
                setItem(JSON.stringify(initialV));
                return;
            }
            if (typeof initialV === "string") {
                setV(vStr as any as T);
            }
            setV(JSON.parse(vStr));
        });
    }, [])

    return [v, setValue];
}