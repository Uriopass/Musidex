import Explorer from "./explorer";
import Users from "./users";
import {NextTrackCallback} from "../common/tracklist";
import SettingsPage from "./settings";
import {Setter} from "../../../musidex-ts-common/utils";
import React, {Suspense, useContext, useState} from "react";
import Submit from "./submit";
import {MetadataCtx} from "../domain/metadata";

export type Page = { path: "explorer" | "users" | "settings" | "music_map", submit: boolean };

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

export const MusicMap = React.lazy(() => import('./map'))

const PageNavigator = (props: NavigatorProps) => {
    const [metadata] = useContext(MetadataCtx);

    const [shown, setShown] = useState(40);
    const onScroll = (e: any) => {
        const elem: HTMLDivElement = e.target;
        if (elem.scrollHeight - elem.scrollTop < elem.clientHeight + 500) {
            if (metadata.musics.length > shown) {
                setShown(shown + 20);
            }
        }
    };

    return (
        <div className={"scrollable-element content"} onScroll={onScroll}>
            {
                props.page.submit && <Submit />
            }
            <Explorer hidden={props.page.path !== "explorer"} curUser={props.curUser} doNext={props.doNext} shown={shown} setShown={setShown}/>
            <Users hidden={props.page.path !== "users"} onSetUser={props.onSetUser} curUser={props.curUser}
                   page={props.page} setCurPage={props.setCurPage}/>
            {(props.page.path === "music_map") &&
                <Suspense fallback={<div>Loading...</div>}>
                    <MusicMap doNext={props.doNext}/>
                </Suspense>
            }
            <SettingsPage hidden={props.page.path !== "settings"}/>
        </div>
    )
}

export default PageNavigator;