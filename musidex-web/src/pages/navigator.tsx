import Explorer from "./explorer";
import Submit from "./submit";
import {NextTrackCallback} from "../domain/tracklist";
import Users from "./users";
import {Setter} from "../components/utils";

export type PageEnum = "explorer" | "submit" | "users";

interface NavigatorProps {
    page: PageEnum;
    doNext: NextTrackCallback;
    setUser: Setter<number>;
    curUser: number;
}

export interface PageProps {
    hidden: boolean;
}

const PageNavigator = (props: NavigatorProps) => {
    return (
        <>
            <Explorer title="Musics" hidden={props.page !== "explorer"} doNext={props.doNext}/>
            <Submit hidden={props.page !== "submit"}/>
            <Users hidden={props.page !== "users"} setUser={props.setUser} curUser={props.curUser}/>
        </>
    )
}

export default PageNavigator;