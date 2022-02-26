// eslint-disable-next-line import/no-unassigned-import
import './options-storage.js';
import optionsStorage from "./options-storage";
import {parseURL} from "./url";

let apiURL = "";
optionsStorage.getAll().then((v) => {
    apiURL = parseURL(v.api_url);

    fetch(apiURL + "/api/metadata_extension").then((resp) => {
        if (!resp.ok) {
            return;
        }
        return resp.json();
    }).then((resp) => {
        chrome.storage.sync.set({
            metadata: resp,
        });
    }).catch(() => {})
})
