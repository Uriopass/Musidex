import './navbar.css'
import {MaterialIcon} from "./utils";
import React, {useCallback} from "react";
import {User} from "../common/entity";
import {Page} from "../pages/navigator";
import {Setter} from "../common/utils";

interface NavbarProps {
    page: Page,
    setCurPage: Setter<Page>;
    syncProblem: boolean;
    curUser?: User;
}

const Navbar = React.memo((props: NavbarProps) => {
    const setPath = useCallback((path) => {
        props.setCurPage({...props.page, path: path});
    }, [props.page, props.setCurPage]);
    return (
        <ul className="navbar color-fg">
            <div className="navbar-elems">
                <div style={{display: "flex"}}>
                    <button className="navbar-button" onClick={() => setPath("explorer")} title="Home">
                        <MaterialIcon name="home"/>
                    </button>
                    <button className="navbar-button" style={{color: props.page.submit ? "var(--primary)" : undefined}} onClick={() => props.setCurPage({...props.page, submit: !props.page.submit})} title="Add musics to the library">
                        <MaterialIcon name="file_upload" size={25}/>
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
                    <button className="navbar-button" onClick={() => setPath("users")} title="Manage users">
                        {props.curUser?.name || ""}&nbsp;
                        <MaterialIcon name="person" size={25}/>
                    </button>
                    {
                    <button className="navbar-button" onClick={() => setPath("settings")} title="Settings">
                        <MaterialIcon name="settings" size={20}/>
                    </button>
                    }
                </div>
            </div>
        </ul>
    )
})

export default Navbar;