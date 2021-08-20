import './submit.css'
import TextInput from "./input";
import {FormEvent, useState} from "react";

const Submit = (props: any) => {
    const [ytUrl, setYTUrl] = useState("");

    const YTsubmit = (ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        console.log(ytUrl);
    };

    return (
        <div className={"submit color-fg "+ (props.hidden ? "hidden" : "")}>
            <span className="title color-fg">
                Upload
            </span>
            <form onSubmit={YTsubmit}>
                <TextInput onChange={setYTUrl} name="Youtube URL" withLabel={true}/>
            </form>
        </div>
    )
}


export default Submit;