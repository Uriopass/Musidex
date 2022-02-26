import {parseURL} from "./url";

let apiURL = "";
chrome.storage.local.get(['apiurl'], (res) => {
    apiURL = parseURL(res.apiurl);

    fetch(apiURL + "/api/metadata_extension").then((resp) => {
        if (!resp.ok) {
            return;
        }
        return resp.json();
    }).then((resp) => {
        chrome.storage.local.set({
            metadata: resp,
        });
    }).catch(() => {})
})
