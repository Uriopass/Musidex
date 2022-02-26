import optionsStorage from './options-storage.js';
import {parseURL} from "./url";

let apiURL = "";
let metadata;
let selectedUser;
optionsStorage.getAll().then((v) => {
    apiURL = parseURL(v.api_url);
})
chrome.storage.sync.get(['metadata', 'selecteduser'], (res) => {
    metadata = res.metadata;
    if (metadata) {
        if (selectedUser === undefined) {
            selectedUser = metadata.users[0];
        }
    }
    if (res.selecteduser) {
        selectedUser = res.selecteduser;
    }
});

function youtubeUpload(url) {
    if (apiURL === "" || selectedUser === undefined) {
        return;
    }
    return fetch(apiURL + "/api/youtube_upload", {
        method: "post",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url: url, uid: selectedUser.id}),
    });
}

function musidexOnClick() {
    youtubeUpload(window.location.href);
}

let musicIcon = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#ad70bd"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 5v8.55c-.94-.54-2.1-.75-3.33-.32-1.34.48-2.37 1.67-2.61 3.07-.46 2.74 1.86 5.08 4.59 4.65 1.96-.31 3.35-2.11 3.35-4.1V7h2c1.1 0 2-.9 2-2s-.9-2-2-2h-2c-1.1 0-2 .9-2 2z"/></svg>`;

function musidexChangeUser() {
    let d = document.getElementById("musidexUserSelect");
    let id = parseInt(d.value);
    if (!id) {
        return;
    }
    for (let user of metadata.users) {
        if (user.id === id) {
            selectedUser = user;
            chrome.storage.sync.set({
                selecteduser: user,
            });
            break;
        }
    }
}

let retries = 0;
let showDiv = () => {
    retries += 1;
    let elem = document.getElementById("top-level-buttons-computed");
    if (!elem || metadata === undefined || selectedUser === undefined) {
        if (retries < 10) {
            setTimeout(showDiv, 1000);
        }
        return;
    }

    let outerDiv = document.createElement("div");
    outerDiv.style.display = "flex";
    outerDiv.style.alignItems = "center";
    outerDiv.style.cursor = "pointer";

    let musicIconDiv = document.createElement("div");
    musicIconDiv.innerHTML = musicIcon;
    musicIconDiv.onclick = musidexOnClick;
    musicIconDiv.title = "Add music to Musidex library";

    outerDiv.appendChild(musicIconDiv);

    let select = document.createElement("select");
    select.title = "Change selected user";
    select.style.color = "#ad70bd";
    select.style.maxWidth = "80px";
    select.style.border = "none";
    select.style.backgroundColor = "transparent";
    select.style.cursor = "pointer";
    select.onchange = musidexChangeUser;
    select.id = "musidexUserSelect";

    let html = "";
    for (let user of metadata.users) {
        html += `<option ${user.id === selectedUser.id ? "selected" : ""} value="${user.id}">${user.name}</option>`;
    }
    select.innerHTML = html;
    outerDiv.appendChild(select);

    elem.appendChild(outerDiv);
};


setTimeout(showDiv, 1000);


