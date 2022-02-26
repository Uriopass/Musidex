// Don't forget to import this wherever you use it
import optionsStorage from './options-storage.js';
optionsStorage.syncForm('#options-form');
import {parseURL} from "./url";

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
        fetch(url + "/api/metadata_extension").then((resp) => {
            if (_glob !== glob) {
                return;
            }
            if (!resp.ok) {
                check.style.color = "red";
                check.innerText = "Could not connect :(";
                renderUsers();
                return;
            }
            return resp.json();
        }).then((resp) => {
            chrome.storage.sync.set({
                metadata: resp,
            });
            check.style.color = "green";
            check.innerText = "Connected! :)";
            renderUsers(resp);
        }).catch((e) => {
            if (_glob !== glob) {
                return;
            }
            console.log(e);
            check.style.color = "red";
            check.innerText = "Could not connect :(";
            renderUsers();
        })
    }, 300);
})

function renderUsers(meta) {
    let udiv = document.getElementById("users");
    if(meta === undefined) {
        udiv.innerHTML = "";
        return;
    }
    udiv.innerHTML = `
    <div>Found users:</div>
    `;
    for (let user of meta.users) {
        udiv.innerHTML += `
        <li class="user">
            ${user.name}
        </li>
        `;
    }
}