import './submit.css'
import TextInput from "../components/input";
import {useRef, useState} from "react";
import {MaterialIcon} from "../components/utils";
import API from "../common/api";

const Submit = () => {
    return (
        <div className="submit color-fg ">
            <YTSubmit
                uploadAPI={API.youtubeUpload}
                title="Upload YT Music"
                titleColor="#fb0e0f"
                placeholder="Youtube URL"/>
            <YTSubmit
                uploadAPI={API.youtubeUploadPlaylist}
                showNth={true}
                title="Upload YT Playlist"
                titleColor="#fb0e0f"
                placeholder="Youtube Playlist URL"/>
        </div>
    )
}

type YTSendState =
    { type: "waiting_for_url" }
    | { type: "sending" }
    | { type: "zero_accept" }
    | { type: "accepted_unk" }
    | { type: "accepted", count: number }
    | { type: "error", message?: string };

type YTSubmitProps = {
    uploadAPI: (url: string, indexStart?: number, indexStop?: number) => Promise<Response>,
    title: string,
    placeholder: string,
    titleColor: string,
    showNth?: boolean,
}

const YTSubmit = (props: YTSubmitProps) => {
    const [sendState, setSendState] = useState({type: "waiting_for_url"} as YTSendState);
    const [url, setURL] = useState("");
    const refIndexStart = useRef<HTMLInputElement | null>(null);
    const refIndexStop = useRef<HTMLInputElement | null>(null);

    const onYTInputChange = (v: string) => {
        setURL(v);
        if (v === "") {
            setSendState({type: "waiting_for_url"});
            return;
        }
        setSendState({type: "sending"});
        props.uploadAPI(v, parseInt(refIndexStart.current?.value || "0"), parseInt(refIndexStop.current?.value || "0")).then((res: Response) => {
            setURL("");
            if (res.ok) {
                return res.text();
            }
            if (res.status === 409) {
                setSendState({type: "error", message: "track already in library"});
                return;
            }
            console.log("not ok", res);
            setSendState({type: "error"});
        }).then((v) => {
            if (v === undefined) {
                return;
            }
            if (v === "") {
                setSendState({type: "accepted_unk"});
                return;
            }
            const c = parseInt(v);
            if (!c) {
                setSendState({type: "zero_accept"});
                return;
            }
            setSendState({type: "accepted", count: c});
        }).catch((e) => {
            console.log(e);
            setSendState({type: "error"});
        });
    }

    let icon: string = "";
    let message: string = "";
    let color: string = "var(--color-fg)";
    switch (sendState.type) {
        case "waiting_for_url":
            icon = "upload";
            message = "Paste a URL to begin download";
            color = "var(--color-bg)";
            break;
        case "error":
            icon = "error";
            message = sendState.message || "Server/Network error";
            color = "var(--danger)";
            break;
        case "sending":
            icon = "pending";
            color = "var(--alert)";
            break;
        case "accepted":
            icon = "done"
            message = sendState.count + " musics successfully added to your library. Download will begin shortly"
            color = "var(--success)";
            break;
        case "accepted_unk":
            icon = "done"
            message = "Music(s) successfully added to your library. Download will begin shortly"
            color = "var(--success)";
            break;
        case "zero_accept":
            icon = "error"
            message = "No music found"
            color = "var(--alert)";
            break;
    }

    return (
        <>
            <form style={{display: "flex", alignItems: "flex-end", color: "var(--color-bg)"}}>
                <span title={message} style={{color: color, paddingRight: 10}}>
                    <MaterialIcon name={icon} size="25px"/>
                </span>
                <TextInput value={url}
                           onChange={onYTInputChange}
                           name={props.placeholder}
                           style={{flexGrow: 1}}
                           title="Input is not a valid youtube URL"
                           withLabel={true}/>
                {props.showNth &&
                    <>
                        <span style={{paddingBottom: 7}}>
                    Playlist index:&nbsp;&nbsp;
                        </span>
                        <input ref={refIndexStart} type="number" placeholder="start" className="form_field" min="0"
                               style={{width: "5rem"}}/>
                        &nbsp;-&nbsp;
                        <input ref={refIndexStop} type="number" placeholder="stop" className="form_field" min="0"
                               style={{width: "5rem"}}/>
                    </>
                }
            </form>
        </>
    )
}


export default Submit;