import './input.css'
import React from "react";

type TextInputProps = {
    name: string;
    minWidth?: string;
    onChange: (value: string) => void;
    withLabel?: boolean;
}

const TextInput = React.memo((props: TextInputProps) => {
    let id = "form_id_" + props.name.toLowerCase();
    const showl = props.withLabel === true;
    return (
        <div className={"form_group field "+(showl ? " form_show_label" :"")} style={{minWidth: props.minWidth || 0}}>
            <input type="input"
                   onChange={(ev) => props.onChange(ev.target.value)}
                   className="form_field"
                   placeholder={props.name}
                   name={id}
                   id={id}
                   autoComplete="off"/>
            {showl ? (
                <label htmlFor={id} className="form_label">{props.name}</label>
            ) : (<></>)}
        </div>)
});

export default TextInput;