import './navbar.css'
import TextInput from "./input";

const Navbar = () => {
    return (
        <ul className="navbar bg color-fg">
            <NavbarElement>
                <span className="material-icons">home</span>
            </NavbarElement>
            <NavbarElement>
                <TextInput name="Search" minWidth="300px" />
                <span className="material-icons">search</span>
            </NavbarElement>
        </ul>
    )
}

const NavbarElement = (props: any) => {
    return (
        <li className="navbar-elem">
            {props.children}
        </li>
    )
}

export default Navbar;