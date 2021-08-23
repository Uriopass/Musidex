import Explorer from "./explorer";
import Submit from "./submit";

export type PageEnum = "explorer" | "submit";

interface NavigatorProps {
    page: PageEnum;
}

const PageNavigator = (props: NavigatorProps) => {
    return (
        <>
            <Explorer title="Musics" hidden={props.page !== "explorer"}/>
            <Submit hidden={props.page !== "submit"}/>
        </>
    )
}

export default PageNavigator;