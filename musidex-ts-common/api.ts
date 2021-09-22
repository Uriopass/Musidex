import {MusidexMetadata, Tag, User} from "./entity";
import ReconnectingWebSocket from 'reconnecting-websocket';
import Pako from "pako";

export type RawMusidexMetadata = {
    musics: number[];
    tags?: Tag[];
    users: User[];
    settings: [string, string][];
    patches?: patch[];
}

type patch = { kind: 'add' | 'update', tag: Tag } | { kind: 'remove', id: number, key: string }

let apiURL = "";
let host = "";

export const API = {
    setAPIUrl(url: string) {
        if (!url.startsWith("http")) {
            url = "http://" + url;
        }
        apiURL = url;
        host = url.split("://")[1] || "";
    },

    metadataWSInit(): ReconnectingWebSocket {
        let prefix = "ws";
        if (apiURL.startsWith("https")) {
            prefix = "wss";
        }

        return new ReconnectingWebSocket(prefix + "://" + host + "/api/metadata/ws");
    },

    async metadataFromWSMsg(m: MessageEvent, oldMeta: MusidexMetadata): Promise<[MusidexMetadata, string]> {
        let vv = new Uint8Array(m.data);
        const s = Pako.inflateRaw(vv, {to: 'string'});
        let v: RawMusidexMetadata = JSON.parse(s);
        return [new MusidexMetadata(v, oldMeta), s];
    },

    async getMetadata(): Promise<MusidexMetadata | null> {
        return fetchJson(apiURL + "/api/metadata").then((v: RawMusidexMetadata) => {
            if (v == null) return null;
            return new MusidexMetadata(v);
        })
    },

    async youtubeUpload(url: string): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({url: url})
        });
    },

    async youtubeUploadPlaylist(url: string): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload/playlist", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({url: url})
        });
    },

    async insertTag(tag: Tag): Promise<Response> {
        return fetch(apiURL + "/api/tag/create", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(tag)
        });
    },

    async updateSettings(key: string, value: string): Promise<Response> {
        return fetch(apiURL + "/api/config/update", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                key: key,
                value: value,
            })
        });
    },

    async deleteMusic(id: number): Promise<Response> {
        return fetch(apiURL + "/api/music/" + id, {
            method: "delete"
        });
    },

    async deleteUser(id: number): Promise<Response> {
        return fetch(apiURL + "/api/user/" + id, {
            method: "delete"
        });
    },

    async createUser(name: string): Promise<Response> {
        return fetch(apiURL + "/api/user/create", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name})
        });
    },

    async renameUser(id: number, name: string): Promise<Response> {
        return fetch(apiURL + "/api/user/update/" + id, {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: name})
        });
    },

    async restartServer(): Promise<Response> {
        return fetch(apiURL + "/api/restart_server", {});
    },

    getStreamSrc(id: number): string {
        return apiURL + "/api/stream/" + id
    },
}

async function fetchJson(url: string): Promise<any | null> {
    try {
        let v = await fetch(url);
        if (!v.ok) {
            console.log("failed fetching " + url);
            return null;
        }
        return await v.json();
    } catch (e) {
        return null;
    }
}

export default API;
