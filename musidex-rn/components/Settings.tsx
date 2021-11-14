import React, {useContext, useEffect, useState} from "react";
import {ScrollView, StyleSheet, View} from "react-native";
import {Checkbox, SearchInput} from "./Input";
import Ctx from "../domain/ctx";
import useStored from "../domain/useStored";
import {Icon} from "react-native-elements";
import {TextBg, TextFg} from "./StyledText";
import API from "../common/api";
import Colors from "../domain/colors"
import {LocalSettings} from "../domain/localsettings";
import {MusidexMetadata} from "../common/entity";

function Settings() {
    const [metadata] = useContext(Ctx.Metadata);
    const [apiUrl, setAPIUrl] = useContext(Ctx.APIUrl);
    const [localSettings, setLocalSettings] = useContext(Ctx.LocalSettings);
    const [localApiUrl, setLocalAPIUrl] = useStored("local_api_url", 0, apiUrl);

    const [connectivity, setConnectivity] = useState("no_url");

    const testConnectivity = () => {
        setConnectivity("pending");
        API.testConnection(localApiUrl).then((res) => {
            if (res) {
                setConnectivity("ok");
                return;
            }
            setConnectivity("error");
        });
    }

    useEffect(testConnectivity, [apiUrl]);

    let icon = "";
    let message = "";
    let color = "";

    switch (connectivity) {
        case "pending":
            icon = "pending"
            message = "testing connectivity..."
            color = Colors.alert;
            break
        case "ok":
            icon = "check-circle"
            message = "connection ok"
            color = Colors.success;
            break
        case "error":
            icon = "error"
            message = "could not connect :("
            color = Colors.danger;
            break
    }

    return <ScrollView style={styles.container}>
        <SearchInput value={localApiUrl} onChangeText={(t) => setLocalAPIUrl(t)}
                     onBlur={() => {
                         setAPIUrl(localApiUrl);
                     }}
                     placeholder="Enter API Url"/>
        <View style={styles.connectivityContainer}>
            {icon !== "" &&
            <Icon size={20} color={color} name={icon}/>
            }
            <TextFg> {message}</TextFg>
        </View>
        <Checkbox
            style={styles.settingItem}
            checked={localSettings.downloadMusicLocally}
                  onChange={(newv: boolean) => setLocalSettings({...localSettings, downloadMusicLocally: newv})}>
            <TextFg> Download music locally for off-line play</TextFg>
        </Checkbox>
        {
            localSettings.downloadMusicLocally && <DownloadUsersList settings={localSettings} setLocalSettings={setLocalSettings} metadata={metadata} />
        }
    </ScrollView>
}

export type DownloadUsersListProps = {
    settings: LocalSettings,
    setLocalSettings: (newv: LocalSettings) => void,
    metadata: MusidexMetadata,
}

function DownloadUsersList(props: DownloadUsersListProps): JSX.Element {
    return <>
    <TextBg style={{paddingTop: 10, paddingLeft: 3}}>Users to download:</TextBg>
    {
        props.metadata.users.map((v) => {
            const checkedIdx = props.settings.downloadUsers.indexOf(v.id);
            return <Checkbox
                key={v.id}
                style={styles.settingItem2}
                checked={checkedIdx !== -1}
                onChange={(newv: boolean) => {
                    if(newv) {
                        props.settings.downloadUsers.push(v.id);
                    } else {
                        props.settings.downloadUsers.splice(checkedIdx, 1);
                    }
                    props.setLocalSettings({...props.settings})
                }}>
                <TextFg> {v.name}</TextFg>
            </Checkbox>;
        })
    }
    </>;
}

const styles = StyleSheet.create({
    connectivityContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 5,
    },
    settingItem: {
        paddingTop: 10,
    },
    settingItem2: {
        paddingBottom: 10,
    },
    container: {
        flex: 1,
        paddingLeft: 10,
        paddingTop: 10,
    },
})

export default Settings;