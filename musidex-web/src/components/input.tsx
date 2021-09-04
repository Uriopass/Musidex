import './input.css'
import React, {useState} from "react";

type TextInputProps = {
    name: string;
    minWidth?: string;
    onChange: (value: string) => void;
    withLabel?: boolean;
    pattern?: string;
    title?: string;
    startValue?: string;
}

const TextInput = React.memo((props: TextInputProps) => {
        let id = "form_id_" + props.name.toLowerCase();
        const showl = props.withLabel === true;
        let [v, setV] = useState(props.startValue);
        return <div className={"form_group field " + (showl ? " form_show_label" : "")}
                    style={{minWidth: props.minWidth || 0}}>
            <input type="search"
                   onChange={(ev) => {
                       setV(ev.target.value);
                       props.onChange(ev.target.value);
                   }}
                   className="form_field"
                   placeholder={props.name}
                   name={id}
                   id={id}
                   title={props.title}
                   pattern={props.pattern}
                   autoComplete="off"
                   value={v}/>
            {showl &&
            <label htmlFor={id} className="form_label">{props.name}</label>
            }
        </div>;
    }
);

export default TextInput;