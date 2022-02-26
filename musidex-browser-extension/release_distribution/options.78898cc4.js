let $569ff22bb7781ea8$var$glob = 0;

function $569ff22bb7781ea8$var$onInputChange() {
  let v = document.getElementById("apiURL");
  if (!v) return;
  if (chrome.storage.local.set({
    apiurl: v.value
  }), "" === v.value) return;
  $569ff22bb7781ea8$var$glob += 1;
  let _glob = $569ff22bb7781ea8$var$glob;
  setTimeout((() => {
    if (_glob !== $569ff22bb7781ea8$var$glob) return;
    let check = document.getElementById("loading");
    check.style.color = "gray", check.innerText = "Checking...";
    let url = function(url) {
      if (!url) return "";
      for (url.startsWith("http") || (url = "http://" + url); url.endsWith("/"); ) url = url.slice(0, url.length - 1);
      return url;
    }(v.value);
    fetch(url + "/api/metadata_extension").then((resp => {
      if (_glob === $569ff22bb7781ea8$var$glob) {
        if (!resp.ok || 404 === resp.status) throw "Network error";
        return resp.json();
      }
    })).then((resp => {
      chrome.storage.local.set({
        metadata: resp
      }), check.style.color = "green", check.innerText = "Connected! :)", $569ff22bb7781ea8$var$renderUsers(resp);
    })).catch((e => {
      _glob === $569ff22bb7781ea8$var$glob && (console.log(e), check.style.color = "red", 
      check.innerText = "Could not connect :(", $569ff22bb7781ea8$var$renderUsers());
    }));
  }), 300);
}

function $569ff22bb7781ea8$var$renderUsers(meta) {
  let udiv = document.getElementById("users");
  if (void 0 !== meta) {
    udiv.innerHTML = "\n    <div>Found users:</div>\n    ";
    for (let user of meta.users) udiv.innerHTML += `\n        <li class="user">\n            ${user.name}\n        </li>\n        `;
  } else udiv.innerHTML = "";
}

chrome.storage.local.get([ "apiurl" ], (res => {
  document.getElementById("apiURL").value = res.apiurl || "", $569ff22bb7781ea8$var$onInputChange();
})), document.getElementById("apiURL").addEventListener("input", $569ff22bb7781ea8$var$onInputChange);