import {MusidexMetadata, Tag} from "./entity";
import {Setter} from "../components/utils";
import ReconnectingWebSocket from 'reconnecting-websocket';

let apiURL = window.location.origin;

type RawMusidexMetadata = {
    musics: number[];
    tags: Tag[];
}

export const API = {
    metadataWSInit(): ReconnectingWebSocket {
        let prefix = "ws";
        if (location.protocol === "https:") {
            prefix = "wss";
        }

        return new ReconnectingWebSocket(prefix+"://"+ window.location.host + "/api/metadata/ws");
    },

    metadataWSSet(setMetadata: Setter<MusidexMetadata>): (m: MessageEvent) => void {
        return (m) => {
            let v: RawMusidexMetadata = JSON.parse(m.data);
            let meta = new MusidexMetadata(v.musics, v.tags);
            setMetadata(meta);
        };
    },

    async getMetadata(): Promise<MusidexMetadata | null> {
        return fetchJson(apiURL + "/api/metadata").then((v: RawMusidexMetadata) => {
            if (v == null) return null;
            return new MusidexMetadata(v.musics, v.tags);
        })
    },

    async youtubeUpload(url: string): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({url: url,})
        });
    },

    async youtubeUploadPlaylist(url: string): Promise<Response> {
        return fetch(apiURL + "/api/youtube_upload/playlist", {
            method: "post",
            headers: {"Content-Type": "application/json",},
            body: JSON.stringify({url: url,})
        });
    },

    async deleteMusic(id: number): Promise<Response> {
        return fetch(apiURL + "/api/music/" + id, {
            method: "delete"
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
