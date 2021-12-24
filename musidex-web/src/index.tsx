import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import NoSleep from "@uriopass/nosleep.js";

ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);

let wakeLock: any = null;

// Function that attempts to request a wake lock.
const requestWakeLock = async () => {
    try {
        if('wakeLock' in navigator) {
            // @ts-ignore
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                wakeLock = null;
            });
            console.log("screen lock acquired");
        }
    } catch (err) {}
};

const handleVisibilityChange = () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
};

requestWakeLock();

document.addEventListener('visibilitychange', handleVisibilityChange);
document.addEventListener('fullscreenchange', handleVisibilityChange);

let noSleep = new NoSleep();
let enabled = false;
export function enableNoSleep() {
    if(!enabled) {
        console.log("no sleep using mute background video/audio enabled");
        enabled = true;
        noSleep.enable();
    }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
