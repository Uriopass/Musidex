import './navbar.css'
import {MaterialIcon, Setter} from "./utils";
import React from "react";
import {User} from "../common/entity";
import {PageEnum} from "../pages/navigator";

interface NavbarProps {
    setCurPage: Setter<PageEnum>;
    syncProblem: boolean;
    curUser?: User;
}

const Navbar = React.memo((props: NavbarProps) => {
    return (
        <ul className="navbar color-fg">
            <div className="navbar-elems">
                <div style={{display: "flex"}}>
                    <button className="navbar-button" onClick={() => props.setCurPage("explorer")} title="Home">
                        <MaterialIcon name="home"/>
                        &nbsp;Home
                    </button>
                    <button className="navbar-button" onClick={() => props.setCurPage("submit")} title="Add musics to the library">
                        <MaterialIcon name="file_upload" size={25}/>
                        &nbsp;Upload
                    </button>
                    {
                        props.syncProblem &&
                        <div style={{color: "var(--danger)", display: "flex", padding: "0 6px"}}>
                            <MaterialIcon name="sync_problem" size={25}
                                          title="There is a problem connecting to the server"/>
                        </div>
                    }
                </div>
                <div style={{display: "flex"}}>
                    <button className="navbar-button" onClick={() => props.setCurPage("users")} title="Manage users">
                        {props.curUser?.name || ""}&nbsp;
                        <MaterialIcon name="person" size={25}/>
                    </button>
                    {
                    <button className="navbar-button" onClick={() => props.setCurPage("settings")} title="Settings">
                        <MaterialIcon name="settings" size={20}/>
                    </button>
                    }
                </div>
            </div>
        </ul>
    )
})

export default Navbar;