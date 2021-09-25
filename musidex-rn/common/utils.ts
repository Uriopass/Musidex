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