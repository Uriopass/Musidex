import './navbar.css'
import TextInput from "./input";
import {MaterialIcon} from "./utils";

const Navbar = () => {
    return (
        <ul className="navbar bg color-fg">
            <NavbarElement size="1">
                <MaterialIcon name="home" />
            </NavbarElement>
            <NavbarElement size="5">
                <div style={{display: "flex", minWidth: "100%"}}>
                    <TextInput name="Search" minWidth="50%" />
                    <MaterialIcon name="search" style={{marginLeft: "25px"}} />
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