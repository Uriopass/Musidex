import Explorer from "./explorer";
import Users from "./users";
import {NextTrackCallback} from "../common/tracklist";
import SettingsPage from "./settings";
import {Setter} from "../common/utils";
import React, {Suspense, useCallback, useEffect, useState} from "react";
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

function parsePage(path: string): Page {
    switch (path) {
        case "users":
        case "settings":
        case "music_map":
        case "merge":
            return {path: path, submit: false}
    }
    return {path: "explorer", submit: false}
}

function makeURL(path: string): string {
    let url = new URL(window.location.href);
    url.pathname = path;
    return url.toString();
}

export function usePage(): [Page, Setter<Page>] {
    const [curPage, setCurPageRaw] = useState<Page>(() => {
        let path = window.location.pathname.split("/").pop();
        let page = parsePage(path || "");
        window.history.replaceState(page, "", makeURL(path || ""));
        return page;
    });

    const setCurPage = useCallback((page: Page | ((prevState: Page) => Page)) => {
        setCurPageRaw((oldPage) => {
            let newPage: Page;
            if (typeof page === "function") {
                newPage = page(oldPage);
            } else {
                newPage = page;
            }
            let path: string = newPage.path;
            if (path === "explorer") {
                path = "";
            }
            if (window.history.state.path !== newPage.path) {
                window.history.pushState(newPage, "", makeURL(path));
            }
            return newPage;
        });
    }, [setCurPageRaw]);

    useEffect(() => {
        window.onpopstate = (newPage: PopStateEvent) => {
            setCurPageRaw(newPage.state);
        };
    }, [setCurPageRaw]);

    return [curPage, setCurPage]
}

export default PageNavigator;