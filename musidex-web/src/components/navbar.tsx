import './navbar.css'
import TextInput from "./input";

const Navbar = () => {
    return (
        <ul className="navbar bg color-fg">
            <NavbarElement size="1">
                <span className="material-icons">home</span>
            </NavbarElement>
            <NavbarElement size="5">
                <div style={{display: "flex", minWidth: "100%"}}>
                    <TextInput name="Search" minWidth="50%" />
                    <span className="material-icons" style={{marginLeft: "25px"}}>search</span>
                </div>
            </NavbarElement>
        </ul>
    )
}

const NavbarElement = (props: any) => {
    return (
        <li className="navbar-elem" style={{flexGrow: props.size}}>
            {props.children}
        </li>
    )
}

export default Navbar;