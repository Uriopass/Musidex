import './submit.css'
import TextInput from "../components/input";
import {FormEvent, useState} from "react";
import {MaterialIcon} from "../components/utils";
import API from "../domain/api";

/* eslint-disable no-useless-escape */
const Submit = (props: any) => {
    return (
        <div className={"submit color-fg " + (props.hidden ? "hidden" : "")}>
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
    )
}

type YTSendState =
    { type: "waiting_for_url" }
    | { type: "invalid_url" }
    | { type: "sending" }
    | { type: "accepted" }
    | { type: "error" };

type YTSubmitProps = {
    description: string,
    uploadAPI: (url: string) => Promise<Response>,
    title: string,
    placeholder: string,
    titleColor: string,
}

const YTSubmit = (props: YTSubmitProps) => {
    const [ytUrl, setYTUrl] = useState("");
    const [sendState, setSendState] = useState({type: "waiting_for_url"} as YTSendState);

    const YTsubmit = (ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        console.log(ytUrl);
    };
    const re = new RegExp(/^(https:\/\/)?(www\.)?(youtu|youtube)\.(com|be)\b[-a-zA-Z0-9@:%_+.~#?&/=]*/);

    const onYTInputChange = (v: string) => {
        setYTUrl(v);
        if (v === "") {
            setSendState({type: "waiting_for_url"});
            return;
        }
        if (!re.test(v)) {
            setSendState({type: "invalid_url"});
            return;
        }
        setSendState({type: "sending"});
        props.uploadAPI(v).then((res: Response) => {
            if (res.ok) {
                setSendState({type: "accepted"});
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
        case "invalid_url":
            icon = "error";
            message = "Invalid URL";
            color = "var(--danger)";
            break;
        case "error":
            icon = "error";
            message = "Server/Network error";
            color = "var(--danger)";
            break;
        case "sending":
            icon = "pending";
            color = "var(--alert)";
            break;
        case "accepted":
            icon = "done"
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
            <form onSubmit={YTsubmit}>
                <TextInput onChange={onYTInputChange}
                           name={props.placeholder}
                           title="Input is not a valid youtube URL"
                           withLabel={true}
                           pattern={re.source}/>
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