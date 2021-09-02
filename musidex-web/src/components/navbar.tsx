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
            <div className="navbar-elems">
                <button onClick={() => props.setCurPage("explorer")} title="Home">
                    <MaterialIcon name="home"/>
                    &nbsp;Home
                </button>
                <button onClick={() => props.setCurPage("submit")} title="Add musics to the library">
                    <MaterialIcon name="file_upload" size={25}/>
                    &nbsp;Upload
                </button>
                <button onClick={() => props.setCurPage("users")} title="Manage users">
                    <MaterialIcon name="manage_accounts" size={25}/>
                    &nbsp;Users
                </button>
                {
                    props.syncProblem &&
                    <div style={{color: "var(--danger)", display: "flex", padding: "0 6px"}}>
                        <MaterialIcon name="sync_problem" size={25} title="There is a problem connecting to the server"/>
                    </div>
                }
            </div>
        </ul>
    )
})

export default Navbar;