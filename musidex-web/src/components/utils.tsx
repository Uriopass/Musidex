import './utils.css'
import React, {createContext, FormEvent, useCallback, useContext, useState} from "react";
import {Setter, useUpdate} from "../common/utils";

export const MaterialIcon = React.memo((props: any) => {
    let size = props.size || 20;
    return (<span className="material-icons"
                  onClick={props.onClick}
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
                 onPaste={(e) => {
                     e.stopPropagation();
                 }}
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
        days: 365*5,
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

// @ts-ignore
let indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;
let dbVersion = 1.0;

let dberrored = false;
let db: IDBDatabase;
let initOnce = false;

function initDB(): Promise<null> {
    return new Promise((resolve => {
        let request = indexedDB.open("elephantFiles", dbVersion);

        request.onerror = function () {
            console.log("Error requesting IndexedDB database");
            dberrored = true;
            resolve(null);
        };

        request.onsuccess = function () {
            console.log("Success creating/accessing IndexedDB database");
            db = request.result;
            resolve(null);
        }

        request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
            console.log("creating objectStore")
            // @ts-ignore
            event.target?.result.createObjectStore("elephants");
        };
    }));
}


function putStringInDb(key: string, blob: string) {
    let transaction = db.transaction(["elephants"], "readwrite");
    transaction.objectStore("elephants").put(blob, key);
}

function getStringFromDb(key: string): Promise<string | undefined> {
    // Open a transaction to the database
    let transaction = db.transaction(["elephants"], "readonly");

    return new Promise((resolve) => {
        // Put the blob into the dabase
        let req = transaction.objectStore("elephants").get(key);

        let resonce = true;
        req.onsuccess = function () {
            if(resonce) {
                resolve(req.result);
                resonce = false;
            }
        }
    });
}

export function useIndexedStorage(key: string, defaultValue: string): [string | null, (newv: string) => void, boolean] {
    const [st, setSt] = useState(defaultValue);
    const [, update] = useUpdate();
    const [firstInit, setFirstInit] = useState("false");

    let setV = useCallback((v: string) => {
        putStringInDb(key, v);
        setSt(v);
    }, [setSt, key]);

    if (dberrored) {
        return [st, setSt, true];
    }

    if (db === undefined) {
        if (!initOnce) {
            initOnce = true;
            initDB().then(() => update());
        }
        return [null, () => {
        }, false];
    }

    if (firstInit !== "ok") {
        if (firstInit === "false") {
            setFirstInit("pending");
            getStringFromDb(key).then((v) => {
                if (v !== undefined) {
                    setSt(v);
                }
                setFirstInit("ok");
            });
        }
        return [null, () => {}, false];
    }

    return [st, setV, true];
}