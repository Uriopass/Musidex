import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
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
                   autoCorrect={false}
                   placeholderTextColor={Colors.colorbg}
                   placeholder="Search" style={[styles.searchInput, searchStyle]} {...textprops}/>
        {(props.value?.length || 0) > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => props.onChangeText?.("")}>
                <Icon size={20} name="clear" color={Colors.colorfg}/>
            </TouchableOpacity>)
        }
    </View>;
}

type CheckboxProps = {
    checked: boolean,
    onChange: (newv: boolean) => void;
    style?: StyleProp<ViewStyle>,
    size?: number,
    children?: JSX.Element;
}

export function Checkbox(props: CheckboxProps) {

    return <TouchableOpacity style={[styles.checkboxContainer, props.style]} onPress={() => props.onChange(!props.checked)}>
        <Icon color={props.checked ? Colors.primary : Colors.colorbg}
              size={props.size}
              name={props.checked ? "check-box" : "check-box-outline-blank"}/>
        {props.children}
    </TouchableOpacity>;
}

const styles = StyleSheet.create({
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
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
