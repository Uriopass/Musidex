import './settings.css'
import {PageProps} from "./navigator";
import React, {useContext} from "react";
import TextInput from "../components/input";
import {MetadataCtx} from "../domain/entity";
import API from "../domain/api";

const SettingsPage = (props: PageProps) => {
    let [metadata, metadataSync] = useContext(MetadataCtx);

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")}>
            <div className="settings color-fg ">
                <span className="title">
                    Settings
                </span>
                {
                    metadata.settings_l.map(([key, value]) => {
                        return <SettingsElem sync={metadataSync} key={key} setting_key={key} value={value}/>;
                    })
                }
            </div>
        </div>
    )
}

type SettingsElemProps = {
    setting_key: string;
    value: string;
    sync: () => void;
}

const SettingsElem = React.memo((props: SettingsElemProps) => {
    return <div className="settings-elem">
        <TextInput name={props.setting_key}
                   withLabel={true}
                   startValue={props.value}
                   onBlur={(v) => {
                       API.updateSettings(props.setting_key, v).then(() => props.sync());
                   }}/>
    </div>;
})

export default SettingsPage;