import './input.css'
import React, {CSSProperties} from "react";

type TextInputProps = {
    name: string;
    onChange: (value: string) => void;
    value: string;
    minWidth?: string;
    onBlur?: (value: string) => void;
    withLabel?: boolean;
    pattern?: string;
    title?: string;
    style?: CSSProperties,
}

const TextInput = React.memo((props: TextInputProps) => {
        let id = "form_id_" + props.name.toLowerCase();
        const showl = props.withLabel === true;
        return <div className={"form_group field " + (showl ? " form_show_label" : "")}
                    style={{...props.style, minWidth: props.minWidth || 0}}>
            <input type="search"
                   onChange={(ev) => {
                       props.onChange(ev.target.value);
                   }}
                   onBlur={(ev) => {
                       if (props.onBlur) {
                           props.onBlur(ev.target.value);
                       }
                   }}
                   className="form_field"
                   placeholder={props.name}
                   name={id}
                   id={id}
                   title={props.title}
                   pattern={props.pattern}
                   autoComplete="off"
                   value={props.value}/>
            {showl &&
            <label htmlFor={id} className="form_label">{props.name}</label>
            }
        </div>;
    }
);

export default TextInput;