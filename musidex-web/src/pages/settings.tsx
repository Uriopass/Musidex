import './settings.css'
import {PageProps} from "./navigator";
import {useContext} from "react";
import TextInput from "../components/input";
import {MetadataCtx} from "../domain/entity";

const SettingsPage = (props: PageProps) => {
    let [metadata] = useContext(MetadataCtx);

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")}>
            <div className="settings color-fg ">
                <span className="title">
                    Settings
                </span>
                {
                    metadata.settings_l.map(([key, value]) => {
                        return <SettingsElem key={key} setting_key={key} value={value}/>;
                    })
                }
            </div>
        </div>
    )
}

type SettingsElemProps = {
    setting_key: string;
    value: string;
}

const SettingsElem = (props: SettingsElemProps) => {
    return <div className="settings-elem">
        <TextInput name={props.setting_key} withLabel={true} startValue={props.value} onChange={_ => _}/>
    </div>;
}

export default SettingsPage;