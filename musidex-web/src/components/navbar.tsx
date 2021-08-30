import './navbar.css'
import {MaterialIcon, Setter} from "./utils";
import React from "react";
import {PageEnum} from "../pages/navigator";

interface NavbarProps {
    setCurPage: Setter<PageEnum>;
    onSync: () => void;
    syncProblem: boolean;
}

const Navbar = React.memo((props: NavbarProps) => {
    let syncStyle;
    if (props.syncProblem) {
        syncStyle = {color: "var(--danger)"}
    }

    return (
        <ul className="navbar bg color-fg">
            <NavbarElement size="1" style={{justifyContent: "flex-end"}}>
                <button onClick={() => props.setCurPage("explorer")} title="Home">
                    <MaterialIcon name="home"/>
                </button>
                <button onClick={() => props.setCurPage("submit")} title="Add musics to the library">
                    <MaterialIcon name="file_upload" size={25}/>
                </button>
                <button onClick={() => props.onSync()} style={syncStyle}
                        title={props.syncProblem ? "There is a problem connecting to the server" : ""}>
                    <MaterialIcon name={props.syncProblem ? "sync_problem" : "sync"} size={25}/>
                </button>
            </NavbarElement>
            <NavbarElement size="3" />
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