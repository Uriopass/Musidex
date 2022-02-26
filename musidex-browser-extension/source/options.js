// Don't forget to import this wherever you use it
import optionsStorage from './options-storage.js';

optionsStorage.syncForm('#options-form');

function parseURL(url) {
    if (url === "") {
        return "";
    }
    if (!url.startsWith("http")) {
        url = "http://" + url;
    }
    while (url.endsWith("/")) {
        url = url.slice(0, url.length - 1);
    }
    return url;
}

let glob = 0;

document.getElementById("apiURL").addEventListener('input', () => {
    let v = document.getElementById("apiURL");

    glob += 1;
    let _glob = glob;
    setTimeout(() => {
        if (_glob !== glob) {
            return;
        }
        let check = document.getElementById("loading");
        check.style.color = "gray";
        check.innerText = "Checking...";
        let url = parseURL(v.value);
        fetch(url + "/api/ping").then((resp) => {
            if (_glob !== glob) {
                return;
            }
            if (!resp.ok) {
                check.style.color = "red";
                check.innerText = "Could not connect :(";
                return;
            }
            check.style.color = "green";
            check.innerText = "Connected! :)";
        }).catch(() => {
            if (_glob !== glob) {
                return;
            }
            check.style.color = "red";
            check.innerText = "Could not connect :(";
        })
    }, 300);
})