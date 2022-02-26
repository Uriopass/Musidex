import optionsStorage from './options-storage.js';

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

let apiURL = "";
optionsStorage.getAll().then((v) => {
    apiURL = parseURL(v.api_url);
})

function youtubeUpload(url) {
    if(apiURL === "") {
        return;
    }
    return fetch(apiURL + "/api/youtube_upload", {
        method: "post",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url: url, uid: 1}),
    });
}

function onClick() {
    youtubeUpload(window.location.href);
}

setTimeout(() => {
    let div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.cursor = "pointer";
    div.innerHTML = musicIcon;
    div.title = "Add music to Musidex library";
    div.onclick = onClick;

    document.getElementById("top-level-buttons-computed").append(div);
}, 1000);


let musicIcon = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#ad70bd"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 5v8.55c-.94-.54-2.1-.75-3.33-.32-1.34.48-2.37 1.67-2.61 3.07-.46 2.74 1.86 5.08 4.59 4.65 1.96-.31 3.35-2.11 3.35-4.1V7h2c1.1 0 2-.9 2-2s-.9-2-2-2h-2c-1.1 0-2 .9-2 2z"/></svg>`;