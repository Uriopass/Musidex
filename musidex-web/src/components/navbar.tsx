import './navbar.css'
import TextInput from "./input";
import {MaterialIcon, Setter} from "./utils";
import React from "react";
import {PageEnum} from "./navigator";

interface NavbarProps {
    setCurPage: Setter<PageEnum>;
    onSync: () => void;
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
                <button onClick={() => props.onSync()}>
                    <MaterialIcon name="sync" size={25}/>
                </button>
            </NavbarElement>
            <NavbarElement size="4">
                <TextInput onChange={(v) => console.log("search v changed", v)} name="Search" minWidth="50%"/>
                <MaterialIcon name="search" style={{marginLeft: "25px"}}/>
            </NavbarElement>
            <NavbarElement size="1" />
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