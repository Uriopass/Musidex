import {StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle, TouchableOpacity, View} from "react-native";
import React, {useState} from "react";
import Colors from "../domain/colors";
import {Icon} from "react-native-elements";

export function SearchInput(props: TextInputProps & { searchStyle?: StyleProp<TextStyle> }) {
    const {style, searchStyle, ...textprops} = props;
    const [active, setActive] = useState(false);

    return <View style={[styles.searchContainer, style, active && styles.searchContainerActive]}>
        <TextInput returnKeyType="search" autoCapitalize="none"
                   onFocus={(e) => {
                       setActive(true);
                       props.onFocus?.(e);
                   }}
                   onBlur={(e) => {
                       setActive(false);
                       props.onBlur?.(e);
                   }}
                   placeholder="Search" style={[styles.searchInput, searchStyle]} {...textprops}/>
        {(props.value?.length || 0) > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => props.onChangeText?.("")} >
                <Icon size={20} name="clear" color={Colors.colorfg}/>
            </TouchableOpacity>)
        }
    </View>
}

const styles = StyleSheet.create({
    clearButton: {
        position: "absolute",
        right: 0,
        zIndex: 1,
        width: 40,
        height: 30,
        justifyContent: "center",
    },
    searchContainerActive: {
        borderBottomColor: Colors.primary,
    },
    searchContainer: {
        position: "relative",
        marginVertical: 10,
        borderBottomColor: Colors.fg,
        borderBottomWidth: 2,
        marginHorizontal: 5,
        justifyContent: "center",
    },
    searchInput: {
        color: Colors.colorfg,
        paddingVertical: 0,
    },
});