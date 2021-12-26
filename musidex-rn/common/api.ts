import {makeRawMeta, MusidexMetadata, newMetadata, Tag, User} from "./entity";
import ReconnectingWebSocket from 'reconnecting-websocket';
import Pako from "pako";

export type RawMusidexMetadata = {
    musics: number[];
    tags?: Tag[];
    users: User[];
    settings: [string, string][];
    patches?: patch[];
    version: number;
}

type patch = { kind: 'add' | 'update' | 'remove', tag: Tag }

let apiURL = "";
let host = "";

function parseURL(url: string): string {
    if (!url.startsWith("http")) {
        url = "http://" + url;
    }
    while (url.endsWith("/")) {
        url = url.slice(0, url.length - 1);
    }
    return url;
}

export const API = {
    setAPIUrl(url: string) {
        apiURL = parseURL(url);
        host = apiURL.split("://")[1] || "";
    },

    getAPIUrl(): string {
        return apiURL;
    },

    metadataWSInit(): ReconnectingWebSocket {
        let prefix = "ws";
        if (apiURL.startsWith("https")) {
            prefix = "wss";
        }

        return new ReconnectingWebSocket(prefix + "://" + host + "/api/metadata/ws");
    },

    async testConnection(localApiUrl: string): Promise<boolean> {
        return fetch(parseURL(localApiUrl) + "/api/ping").then((v) => v.ok).catch(() => false)
    },

    async metadataFromWSMsg(m: MessageEvent, oldMeta: MusidexMetadata): Promise<[MusidexMetadata, string]> {
        let vv = new Uint8Array(m.data);
        const s = Pako.inflateRaw(vv, {to: 'string'});
        let v: RawMusidexMetadata = JSON.parse(s);
        let newmeta = newMetadata(v, oldMeta);
        if(v.tags?.length) {
            return [newmeta, s];
        }
        return [newmeta, JSON.stringify(makeRawMeta(newmeta))];
    },

    async getMetadata(): Promise<MusidexMetadata | null> {
        return getRaw(apiURL + "/api/metadata/compressed").then((arr: any) => {
            if (arr === null) {
                return null;
            }
            let vv = new Uint8Array(arr);
            const s = Pako.inflateRaw(vv, {to: 'string'});
            let v: RawMusidexMetadata = JSON.parse(s);
            return newMetadata(v);
        }).catch((e) => {
            console.log(e);
            return null;
        });
    },

    async youtubeUpload(url: string): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({url: url}),
        });
    },

    async youtubeUploadPlaylist(url: string, indexStart?: number, indexStop?: number): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload/playlist", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                url: url,
                indexStart: indexStart ?? 0,
                indexStop: indexStop ?? 0,
            }),
        });
    },

    async insertTag(tag: Tag): Promise<Response> {
        return fetch(apiURL + "/api/tag/create", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(tag),
        });
    },

    async updateSettings(key: string, value: string): Promise<Response> {
        return fetch(apiURL + "/api/config/update", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                key: key,
                value: value,
            }),
        });
    },

    async deleteMusic(id: number): Promise<Response> {
        return fetch(apiURL + "/api/music/" + id, {
            method: "delete",
        });
    },

    async deleteUser(id: number): Promise<Response> {
        return fetch(apiURL + "/api/user/" + id, {
            method: "delete",
        });
    },

    async createUser(name: string): Promise<Response> {
        return fetch(apiURL + "/api/user/create", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name}),
        });
    },

    async renameUser(id: number, name: string): Promise<Response> {
        return fetch(apiURL + "/api/user/update/" + id, {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name}),
        });
    },

    async restartServer(): Promise<Response> {
        return fetch(apiURL + "/api/restart_server", {});
    },

    getStreamSrc(id: number): string {
        return apiURL + "/api/stream/" + id;
    },
};

function getRaw(url: string) {
    return new Promise((accept, reject) => {
        let req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.responseType = "arraybuffer";

        req.onload = () => {
            let resp = req.response;
            if (resp) {
                accept(resp);
            }
        };
        req.onerror = () => {
            reject(req.status);
        };

        req.send(null);
    });
}

export default API;
