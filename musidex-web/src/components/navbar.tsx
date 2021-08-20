import './navbar.css'
import TextInput from "./input";
import {MaterialIcon, Setter} from "./utils";
import React from "react";
import {PageEnum} from "./navigator";

interface NavbarProps {
    setCurPage: Setter<PageEnum>;
}

const Navbar = React.memo((props: NavbarProps) => {
    return (
        <ul className="navbar bg color-fg">
            <NavbarElement size="1" style={{justifyContent: "flex-end"}}>
                <button onClick={() => props.setCurPage("explorer")}>
                    <MaterialIcon name="home"/>
                </button>
                <button onClick={() => props.setCurPage("submit")}>
                    <MaterialIcon name="file_upload" size={25}/>
                </button>
            </NavbarElement>
            <NavbarElement size="3">
                <div style={{display: "flex", minWidth: "100%"}}>
                    <TextInput name="Search" minWidth="50%"/>
                    <MaterialIcon name="search" style={{marginLeft: "25px"}}/>
                </div>
            </NavbarElement>
        </ul>
    )
})

const NavbarElement = React.memo((props: any) => {
    return (
        <li className="navbar-elem " style={{...props.style, flexGrow: props.size}}>
            {props.children}
        </li>
    )
})

export default Navbar;