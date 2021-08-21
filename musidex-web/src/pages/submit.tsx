import './submit.css'
import TextInput from "../components/input";
import {FormEvent, useState} from "react";
import {MaterialIcon} from "../components/utils";
import API from "../domain/api";

/* eslint-disable no-useless-escape */
const Submit = (props: any) => {
    return (
        <div className={"submit color-fg " + (props.hidden ? "hidden" : "")}>
            <YTSubmit/>
        </div>
    )
}

type YTSendState =
    { type: "waiting_for_url" }
    | { type: "invalid_url" }
    | { type: "sending" }
    | { type: "accepted" }
    | { type: "error" };

const YTSubmit = () => {
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
        API.sendYTUrl(v).then((res) => {
            if (res.status === 200) {
                setSendState({type: "accepted"});
                return;
            }
            setSendState({"type": "error"});
        }).catch(() => setSendState({"type": "error"}));
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
            <span className="title color-fg">
                Upload
            </span>
            <br/>
            <br/>
            Paste a valid Youtube URL to add the music to your library.
            <form onSubmit={YTsubmit}>
                <TextInput onChange={onYTInputChange}
                           name="Youtube URL"
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