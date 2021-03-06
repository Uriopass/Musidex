function parseURL(url) {
    if (!url) {
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

chrome.storage.local.get(['apiurl'], (res) => {
    document.getElementById("apiURL").value = res.apiurl || "";
    onInputChange();
});

function onInputChange() {
    let v = document.getElementById("apiURL");
    if(!v) {
        return;
    }

    chrome.storage.local.set({apiurl: v.value});
    if(v.value === "") {
        return;
    }

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
            if (!resp.ok || resp.status === 404) {
                throw "Network error";
            }
            return resp.json();
        }).then((resp) => {
            chrome.storage.local.set({
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
}

document.getElementById("apiURL").addEventListener('input', onInputChange);

function renderUsers(meta) {
    let udiv = document.getElementById("users");
    if(meta === undefined) {
        udiv.innerHTML = "";
        return;
    }

    udiv.innerHTML = "<div>Found users:</div>";

    for (let user of meta.users) {
        let elem = document.createElement("li");
        elem.className = "user";
        elem.innerText = user.name;
        udiv.append(elem);
    }
}