import './utils.css'
import React, {createContext, FormEvent, useContext, useState} from "react";
import {Setter} from "../common/utils";
import useLocalStorage from "use-local-storage";

export const MaterialIcon = React.memo((props: any) => {
    let size = props.size || 20;
    return (<span className="material-icons"
                  style={{
                      ...props.style,
                      fontSize: size,
                      maxWidth: size,
                  }} title={props.title}>
        {props.name}
    </span>)
})

type ProgressBarProps = {
    onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
    progress: number;
    buffered?: [number, number][];
}

export const ProgressBar = React.memo(({onMouseMove, progress, buffered}: ProgressBarProps) => {
    let off = 100 * progress + "%";
    return (
        <div className="progress-container" onMouseDown={onMouseMove} onMouseMove={onMouseMove}>
            <div className="progress-outer">
                {
                    buffered &&
                    buffered.map(([start, end]) =>
                        <div className="progress-bar progress-bar-buffered"
                             key={start + ":" + end}
                             style={{
                                 left: (start * 100) + "%",
                                 width: (end * 100) + "%"
                             }}/>
                    )
                }
                <div className="progress-bar" style={{width: off}}/>
            </div>
            <div className="progress-indicator" style={{left: "calc(-6px + " + off + ")"}}/>
        </div>
    )
})

export type EditableTextProps = {
    onRename: (newName: string) => void;
    text: string;
}

export const EditableCtx = createContext<[boolean, Setter<boolean>]>([false, _ => _]);

export const EditableText = (props: EditableTextProps) => {
    const [editable] = useContext(EditableCtx);

    if (!editable) {
        return <span>{props.text}</span>;
    }

    return <span contentEditable={true}
                onBlur={(v: FormEvent<HTMLSpanElement>) => {
                    if (v.currentTarget.innerText !== props.text) {
                        props.onRename(v.currentTarget.innerText)
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
                onKeyDown={(ev) => {
                    if (ev.code === "Enter") {
                        ev.preventDefault();
                        ev.currentTarget.blur();
                    }
                }}
                suppressContentEditableWarning={true}
                spellCheck={false}
                className="editable-text"
    >
        {props.text}
    </span>;
}

const isBrowser = typeof window !== 'undefined';

interface cookieOptions {
    days?: number;
    path?: string;
}

export const setCookie = (name: string, value: string, options?: cookieOptions) => {
    if (!isBrowser) return;

    const optionsWithDefaults = {
        days: 7,
        path: '/',
        ...options,
    };

    const expires = new Date(
        Date.now() + optionsWithDefaults.days * 864e5
    ).toUTCString();

    document.cookie =
        name +
        '=' +
        encodeURIComponent(value) +
        '; expires=' +
        expires +
        '; path=' +
        optionsWithDefaults.path;
};

export const getCookie = (name: string, initialValue?: string) => {
    return (
        (isBrowser &&
            document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1] || "") : r;
            }, '')) ||
        initialValue
    );
};

export const useCookie = (key: string, initialValue?: string): [string | undefined, (value: string, options?: cookieOptions) => void] => {
    const [item, setItem] = useState(() => {
        return getCookie(key, initialValue);
    });

    const updateItem = (value: string, options?: cookieOptions) => {
        setItem(value);
        setCookie(key, value, options);
    };

    return [item, updateItem];
}