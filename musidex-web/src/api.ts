let apiURL = (process.env.NODE_ENV === "development") ? "http://127.0.0.1:3200" : "http://"+window.location.hostname;

export type Music = {
    id: number;
}

export type Tag = {
    music_id: number;
    key: string;

    text: string | null;
    integer: number | null;
    date: string | null;
    vector: number[] | null;
}

export type Source = {
    music_id: number;
    format: string;
    url: string;
}

export type MusidexMetadata = {
    musics: Music[];
    tags: Tag[];
    sources: Source[];
}

export const API = {
    async getMetadata(): Promise<MusidexMetadata | null> {
        return await fetchJson(apiURL + "/api/metadata");
    }
}

async function fetchJson(url: string): Promise<any | null> {
    try {
        let v = await fetch(url);
        if (v.status !== 200) {
            console.log("failed fetching " + url);
            return null;
        }
        return await v.json();
    } catch (e) {
        return null;
    }
}

export default API;
