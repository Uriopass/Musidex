import Explorer from "./explorer";
import Submit from "./submit";
import Users from "./users";
import {NextTrackCallback} from "../common/tracklist";
import SettingsPage from "./settings";
import {Setter} from "../../../musidex-ts-common/utils";

export type PageEnum = "explorer" | "submit" | "users" | "settings";

interface NavigatorProps {
    page: PageEnum;
    doNext: NextTrackCallback;
    onSetUser: (id: number) => void;
    curUser?: number;
    setCurPage: Setter<PageEnum>;
}

export interface PageProps {
    hidden: boolean;
}

const PageNavigator = (props: NavigatorProps) => {
    return (
        <>
            <Explorer hidden={props.page !== "explorer"} curUser={props.curUser} doNext={props.doNext}/>
            <Submit hidden={props.page !== "submit"}/>
            <Users hidden={props.page !== "users"} onSetUser={props.onSetUser} curUser={props.curUser} setCurPage={}/>
            <SettingsPage hidden={props.page !== "settings"}/>
        </>
    )
}

export default PageNavigator;