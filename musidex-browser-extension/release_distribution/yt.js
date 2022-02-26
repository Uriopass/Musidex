(() => {
  let $2caaa7126b482a30$var$metadata, $2caaa7126b482a30$var$selectedUser, $2caaa7126b482a30$var$apiURL = "";
  function $2caaa7126b482a30$var$musidexOnClick() {
    !function(url) {
      if ("" === $2caaa7126b482a30$var$apiURL || void 0 === $2caaa7126b482a30$var$selectedUser) return;
      let micon = document.getElementById("musidexMusicIcon");
      micon.setAttribute("fill", "#959595"), fetch($2caaa7126b482a30$var$apiURL + "/api/youtube_upload", {
        method: "post",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: url,
          uid: $2caaa7126b482a30$var$selectedUser.id
        })
      }).then((resp => {
        resp.ok || 409 === resp.status || micon.setAttribute("fill", "#ce3d3d"), micon.setAttribute("fill", "#71c771");
      })).catch((e => {
        console.log(e), micon.setAttribute("fill", "#ce3d3d");
      }));
    }(window.location.href);
  }
  chrome.storage.local.get([ "metadata", "selecteduser", "apiurl" ], (res => {
    $2caaa7126b482a30$var$apiURL = function(url) {
      if (!url) return "";
      for (url.startsWith("http") || (url = "http://" + url); url.endsWith("/"); ) url = url.slice(0, url.length - 1);
      return url;
    }(res.apiurl), $2caaa7126b482a30$var$metadata = res.metadata, $2caaa7126b482a30$var$metadata && void 0 === $2caaa7126b482a30$var$selectedUser && ($2caaa7126b482a30$var$selectedUser = $2caaa7126b482a30$var$metadata.users[0]), 
    res.selecteduser && ($2caaa7126b482a30$var$selectedUser = res.selecteduser);
  }));
  function $2caaa7126b482a30$var$musidexChangeUser() {
    let d = document.getElementById("musidexUserSelect"), id = parseInt(d.value);
    if (id) for (let user of $2caaa7126b482a30$var$metadata.users) if (user.id === id) {
      $2caaa7126b482a30$var$selectedUser = user, chrome.storage.local.set({
        selecteduser: user
      });
      break;
    }
  }
  let $2caaa7126b482a30$var$showDiv = () => {
    if (setTimeout($2caaa7126b482a30$var$showDiv, 1e3), void 0 === $2caaa7126b482a30$var$metadata || void 0 === $2caaa7126b482a30$var$selectedUser) return;
    if (document.getElementById("musidexDiv")) return;
    let elem, elems = document.querySelectorAll("#top-level-buttons-computed");
    for (let ielem of elems) if (ielem.childElementCount >= 4 && ielem.childElementCount <= 7) {
      elem = ielem;
      break;
    }
    if (!elem) return;
    let outerDiv = document.createElement("div");
    outerDiv.style.display = "flex", outerDiv.style.alignItems = "center", outerDiv.style.cursor = "pointer", 
    outerDiv.id = "musidexDiv";
    let musicIconDiv = document.createElement("div");
    musicIconDiv.innerHTML = '\n<svg id="musidexMusicIcon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#ad70bd"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 5v8.55c-.94-.54-2.1-.75-3.33-.32-1.34.48-2.37 1.67-2.61 3.07-.46 2.74 1.86 5.08 4.59 4.65 1.96-.31 3.35-2.11 3.35-4.1V7h2c1.1 0 2-.9 2-2s-.9-2-2-2h-2c-1.1 0-2 .9-2 2z"/></svg>', 
    musicIconDiv.onclick = $2caaa7126b482a30$var$musidexOnClick, musicIconDiv.title = "Add music to Musidex library", 
    outerDiv.appendChild(musicIconDiv);
    let select = document.createElement("select");
    select.title = "Change selected user", select.style.color = "#ad70bd", select.style.maxWidth = "80px", 
    select.style.border = "none", select.style.backgroundColor = "transparent", select.style.cursor = "pointer", 
    select.onchange = $2caaa7126b482a30$var$musidexChangeUser, select.id = "musidexUserSelect";
    let html = "";
    for (let user of $2caaa7126b482a30$var$metadata.users) html += `<option ${user.id === $2caaa7126b482a30$var$selectedUser.id ? "selected" : ""} value="${user.id}">${user.name}</option>`;
    select.innerHTML = html, outerDiv.appendChild(select), elem.appendChild(outerDiv);
  };
  setTimeout($2caaa7126b482a30$var$showDiv, 1e3);
})();