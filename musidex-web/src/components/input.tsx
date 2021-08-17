import './input.css'

type TextInputProps = {
    name: string;
    minWidth?: string;
}

const TextInput = (props: TextInputProps) => {
    let id = "form_id_"+props.name.toLowerCase();
    return (
    <div className="form_group field" style={{minWidth: props.minWidth || 0}}>
        <input type="input" className="form_field" placeholder={props.name} name={id} id={id} autoComplete="off"/>
        <label htmlFor={id} className="form_label">{props.name}</label>
    </div>)
};

export default TextInput;