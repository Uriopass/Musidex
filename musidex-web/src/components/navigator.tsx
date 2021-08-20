import Explorer from "./explorer";
import {Fragment} from "react";
import Submit from "./submit";

export type PageEnum = "explorer" | "submit";

interface NavigatorProps {
    page: PageEnum;
}

const PageNavigator = (props: NavigatorProps) => {
    switch (props.page) {
        case "explorer":
            return <Explorer title="musics" />
        case "submit":
            return <Submit />
    }
    return <Fragment />
}

export default PageNavigator;