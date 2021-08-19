import './utils.css'
import React from "react";

export const MaterialIcon = React.memo((props: any) => {
    return (<span className="material-icons" style={{...props.style, fontSize: props.size}}>{props.name}</span>)
})

export const ProgressBar = React.memo((props: any) => {
    return (
        <div className="progress-container" onClick={props.onClick}>
            <div className="progress-outer">
                <div className="progress-bar" style={{width: 100*props.progress+"%"}}/>
            </div>
        </div>
    )
})

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;