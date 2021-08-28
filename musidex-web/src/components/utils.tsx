import './utils.css'
import React, {useCallback, useEffect, useState} from "react";

export const MaterialIcon = React.memo((props: any) => {
    let size = props.size || 20;
    return (<span className="material-icons"
                  style={{
                      ...props.style,
                      fontSize: size,
                      maxWidth: size,
                  }}>
        {props.name}
    </span>)
})

type ProgressBarProps = {
    onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
    progress: number;
}

export const ProgressBar = React.memo(({onMouseMove, progress}: ProgressBarProps) => {
    let off = 100 * progress + "%";
    return (
        <div className="progress-container" onMouseDown={onMouseMove} onMouseMove={onMouseMove}>
            <div className="progress-indicator" style={{left: "calc(-6px + " + off + ")"}}/>
            <div className="progress-outer">
                <div className="progress-bar" style={{width: off}}/>
            </div>
        </div>
    )
})

export function clamp(v: number, lower: number, upper: number) {
    if (v < lower) return lower;
    if (v > upper) return upper;
    return v;
}

export function useUpdate(): [number, () => void] {
    let [v, setV] = useState(0);
    let update = useCallback(() => setV((v) => v + 1), [setV]);
    return [v, update];
}

export const useDebouncedEffect = (effect: React.EffectCallback, deps: React.DependencyList, delay: number) => {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);

        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps || [], delay]);
}

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;