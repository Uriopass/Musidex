import {StyleSheet, View} from "react-native";
import Colors from "../domain/colors";
import {TextBg} from "./StyledText";
import {Icon} from "react-native-elements";
import {DrawerActions, useNavigation} from "@react-navigation/native";
import * as React from "react";

export function Header(props: any) {
    const navigation = useNavigation();

    return <View style={styles.header}>
        <Icon
            name="menu"
            size={25}
            color={Colors.colorbg}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}/>
        <TextBg style={styles.headerTitle}> {props.title}</TextBg>
    </View>;
}

const styles = StyleSheet.create({
    header: {
        height: 30,
        backgroundColor: Colors.bg,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 16,
    },
    headerTitle: {
        fontSize: 18,
    },
});
