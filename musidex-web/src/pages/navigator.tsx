import Explorer from "./explorer";
import Submit from "./submit";
import {NextTrackCallback} from "../domain/tracklist";

export type PageEnum = "explorer" | "submit";

interface NavigatorProps {
    page: PageEnum;
    doNext: NextTrackCallback;
}

const PageNavigator = (props: NavigatorProps) => {
    return (
        <>
            <Explorer title="Musics" hidden={props.page !== "explorer"} doNext={props.doNext}/>
            <Submit hidden={props.page !== "submit"}/>
        </>
    )
}

export default PageNavigator;