import React, {useContext, useEffect, useState} from "react";
import {ScrollView, StyleSheet, View} from "react-native";
import {Checkbox, SearchInput} from "./Input";
import Ctx from "../domain/ctx";
import useStored from "../domain/useStored";
import {Icon} from "react-native-elements";
import {TextFg} from "./StyledText";
import API from "../common/api";
import Colors from "../domain/colors"

function Settings() {
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
    </ScrollView>
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
    container: {
        flex: 1,
        paddingLeft: 10,
        paddingTop: 10,
    },
})

export default Settings;