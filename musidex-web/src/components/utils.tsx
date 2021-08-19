import './utils.css'
import React from "react";

export const MaterialIcon = React.memo((props: any) => {
    return (<span className="material-icons" style={{...props.style, fontSize: props.size}}>{props.name}</span>)
})

type ProgressBarProps = {
    onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
    progress: number;
}

export const ProgressBar = React.memo((props: ProgressBarProps) => {
    let off = 100*props.progress+"%";
    return (
        <div className="progress-container" onMouseDown={props.onMouseMove} onMouseMove={props.onMouseMove}>
            <div className="progress-indicator" style={{left: "calc(-6px + " + off + ")"}}/>
            <div className="progress-outer">
                <div className="progress-bar" style={{width: off}}/>
            </div>
        </div>
    )
})

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;