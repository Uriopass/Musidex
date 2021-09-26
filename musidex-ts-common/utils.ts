import {Vector} from "./entity";

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