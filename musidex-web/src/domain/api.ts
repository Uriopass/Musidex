import {MusidexMetadata, Tag, User} from "./entity";
import ReconnectingWebSocket from 'reconnecting-websocket';

let apiURL = window.location.origin;

type RawMusidexMetadata = {
    musics: number[];
    tags: Tag[];
    users: User[];
}

export const API = {
    metadataWSInit(): ReconnectingWebSocket {
        let prefix = "ws";
        if (window.location.protocol === "https:") {
            prefix = "wss";
        }

        return new ReconnectingWebSocket(prefix + "://" + window.location.host + "/api/metadata/ws");
    },

    async metadataFromWSMsg(m: MessageEvent): Promise<MusidexMetadata> {
        let pako = await import("pako");
        let vv = new Uint8Array(m.data);
        const s = pako.inflateRaw(vv, {to: 'string'});
        let v: RawMusidexMetadata = JSON.parse(s);
        return new MusidexMetadata(v.musics, v.tags, v.users);
    },

    async getMetadata(): Promise<MusidexMetadata | null> {
        return fetchJson(apiURL + "/api/metadata").then((v: RawMusidexMetadata) => {
            if (v == null) return null;
            return new MusidexMetadata(v.musics, v.tags, v.users);
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

    getStreamSrc(id: number): string {
        return apiURL + "/api/stream/" + id
    }
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
