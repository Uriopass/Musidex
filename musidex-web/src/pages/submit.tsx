import './submit.css'
import TextInput from "../components/input";
import {useState} from "react";
import {MaterialIcon} from "../components/utils";
import API from "../common/api";
import {PageProps} from "./navigator";

const Submit = (props: PageProps) => {
    return (
        <div className={"scrollable-element content"  + (props.hidden ? " hidden" : "")}>
            <div className="submit color-fg ">
                <YTSubmit
                    description="Paste a valid Youtube URL to add the music to your library."
                    uploadAPI={API.youtubeUpload}
                    title="YT Music"
                    titleColor="#fb0e0f"
                    placeholder="Youtube URL"/>
                <YTSubmit
                    description="Paste a valid Youtube Playlist URL to add all of its musics to your library."
                    uploadAPI={API.youtubeUploadPlaylist}
                    title="YT Playlist"
                    titleColor="#fb0e0f"
                    placeholder="Youtube Playlist URL"/>
            </div>
        </div>
    )
}

type YTSendState =
    { type: "waiting_for_url" }
    | { type: "sending" }
    | { type: "accepted" }
    | { type: "error", message?: string };

type YTSubmitProps = {
    description: string,
    uploadAPI: (url: string) => Promise<Response>,
    title: string,
    placeholder: string,
    titleColor: string,
}

const YTSubmit = (props: YTSubmitProps) => {
    const [sendState, setSendState] = useState({type: "waiting_for_url"} as YTSendState);

    const onYTInputChange = (v: string) => {
        if (v === "") {
            setSendState({type: "waiting_for_url"});
            return;
        }
        setSendState({type: "sending"});
        props.uploadAPI(v).then((res: Response) => {
            if (res.ok) {
                setSendState({type: "accepted"});
                return;
            }
            if (res.status === 409) {
                setSendState({"type": "error", message: "track already in library"});
                return;
            }
            console.log("not ok", res);
            setSendState({"type": "error"});
        }).catch((e) => {
            console.log(e);
            setSendState({"type": "error"});
        });
    }

    let icon: string = "";
    let message: string = "";
    let color: string = "var(--color-fg)";
    switch (sendState.type) {
        case "waiting_for_url":
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
            message = "Music(s) successfully added to your library. Download will begin shortly."
            color = "var(--success)";
            break;
    }

    return (
        <>
            <span className="title" style={{borderColor: props.titleColor}}>
                {props.title}
            </span>
            <br/>
            <br/>
            {props.description}
            <form>
                <TextInput onChange={onYTInputChange}
                           name={props.placeholder}
                           title="Input is not a valid youtube URL"
                           withLabel={true}/>
            </form>
            <p style={{fontSize: "20px", display: "flex", alignItems: "center", color: color}}>
                <MaterialIcon name={icon} size="25px"/>
                &nbsp;                &nbsp;
                {message}
            </p>
        </>
    )
}


export default Submit;