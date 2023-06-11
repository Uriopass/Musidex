import Explorer from "./explorer";
import Users from "./users";
import {NextTrackCallback} from "../common/tracklist";
import SettingsPage from "./settings";
import {Setter} from "../../../musidex-ts-common/utils";
import React, {Suspense} from "react";
import Submit from "./submit";
import {ErrorBoundary} from "react-error-boundary";
import Merge from "./merge";

export type Page = { path: "explorer" | "users" | "settings" | "music_map" | "merge", submit: boolean };

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
    return (
        <div className={"content"}>
            {
                props.page.submit && <Submit/>
            }
            <Merge hidden={props.page.path !== "merge"} doNext={props.doNext}/>
            <Explorer hidden={props.page.path !== "explorer"} curUser={props.curUser} doNext={props.doNext}/>
            <Users hidden={props.page.path !== "users"} onSetUser={props.onSetUser} curUser={props.curUser}
                   page={props.page} setCurPage={props.setCurPage}/>
            <ErrorBoundary FallbackComponent={() => <div>Error loading map, please reload the page.</div>}>
                {(props.page.path === "music_map") &&
                <Suspense fallback={<div>Loading...</div>}>
                    <MusicMap doNext={props.doNext}/>
                </Suspense>
                }
            </ErrorBoundary>
            <SettingsPage hidden={props.page.path !== "settings"}/>
        </div>
    )
}

export default PageNavigator;