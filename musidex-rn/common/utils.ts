import {Vector} from "./entity";
import React, {useCallback, useEffect, useState} from "react";

export function retain<T>(a: T[], condition: (x: T) => boolean): T[] {
    let i = a.length;

    while (i--) {
        // @ts-ignore
        if (!condition(a[i])) {
            a.splice(i, 1);
        }
    }

    return a;
}

export type Dispatch<T> = (value: T) => void;
export type Setter<S> = Dispatch<S | ((prevState: S) => S)>;

export function dot(v1v: Vector, v2v: Vector): number {
    let v1 = v1v.v;
    let v2 = v2v.v;
    let d = 0;
    for (let i = 0; i < v1.length && i < v2.length; i++) {
        // @ts-ignore
        d += v1[i] * v2[i];
    }
    return d;
}

export function timeFormat(total: number): string {
    let minutes = Math.floor(total / 60);
    let seconds = Math.floor(total % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function clamp(v: number, lower: number, upper: number) {
    if (v < lower) {
        return lower;
    }
    if (v > upper) {
        return upper;
    }
    return v;
}

export function useUpdate(): [number, () => void] {
    const [v, setV] = useState(0);
    const update = useCallback(() => setV((oldv) => oldv + 1), [setV]);
    return [v, update];
}

/* eslint-disable */
export const useDebouncedEffect = (effect: React.EffectCallback, deps: React.DependencyList, delay: number) => {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);

        return () => clearTimeout(handler);
    }, [...deps || [], delay]);
};
/* eslint-enable */