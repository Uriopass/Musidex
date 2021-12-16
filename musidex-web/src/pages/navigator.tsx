import Explorer from "./explorer";
import Users from "./users";
import {NextTrackCallback} from "../common/tracklist";
import SettingsPage from "./settings";
import {Setter} from "../../../musidex-ts-common/utils";

export type Page = { path: "explorer" | "users" | "settings", submit: boolean };

interface NavigatorProps {
    page: Page;
    doNext: NextTrackCallback;
    onSetUser: (id: number) => void;
    curUser?: number;
    setCurPage: Setter<Page>;
}

export interface PageProps {
    hidden: boolean;
}

const PageNavigator = (props: NavigatorProps) => {
    return (
        <>
            <Explorer hidden={props.page.path !== "explorer"} showSubmit={props.page.submit} curUser={props.curUser} doNext={props.doNext}/>
            <Users hidden={props.page.path !== "users"} onSetUser={props.onSetUser} curUser={props.curUser}
                   page={props.page} setCurPage={props.setCurPage} showSubmit={props.page.submit}/>
            <SettingsPage hidden={props.page.path !== "settings"}/>
        </>
    )
}

export default PageNavigator;