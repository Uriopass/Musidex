import './navbar.css'
import {MaterialIcon, Setter} from "./utils";
import React from "react";
import {PageEnum} from "../pages/navigator";

interface NavbarProps {
    setCurPage: Setter<PageEnum>;
    syncProblem: boolean;
}

const Navbar = React.memo((props: NavbarProps) => {
    return (
        <ul className="navbar bg color-fg">
            <NavbarElement size="1" style={{justifyContent: "flex-end", alignItems: "center"}}>
                <button onClick={() => props.setCurPage("explorer")} title="Home">
                    <MaterialIcon name="home"/>
                    Home
                </button>
                <button onClick={() => props.setCurPage("submit")} title="Add musics to the library">
                    <MaterialIcon name="file_upload" size={25}/>
                    Upload
                </button>
                {
                    props.syncProblem &&
                    <div style={{color: "var(--danger)", display: "flex", padding: "0 6px"}}>
                        <MaterialIcon name="sync_problem" size={25} title="There is a problem connecting to the server"/>
                    </div>
                }
            </NavbarElement>
            <NavbarElement size="3"/>
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