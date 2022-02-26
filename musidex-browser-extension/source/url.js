export function parseURL(url) {
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