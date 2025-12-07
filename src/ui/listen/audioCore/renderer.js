// renderer.js
const listenCapture = require('./listenCapture.js');
const params        = new URLSearchParams(window.location.search);
const isListenView  = params.get('view') === 'listen';


window.lucide = {
    startCapture: listenCapture.startCapture,
    stopCapture: listenCapture.stopCapture,
    isLinux: listenCapture.isLinux,
    isMacOS: listenCapture.isMacOS,
    captureManualScreenshot: listenCapture.captureManualScreenshot,
    getCurrentScreenshot: listenCapture.getCurrentScreenshot,
};


window.api.renderer.onChangeListenCaptureState((_event, { status }) => {
    console.log(`[Renderer] 🎯 RECEIVED change-listen-capture-state with status: "${status}"`);
    
    if (!isListenView) {
        console.log('[Renderer] Non-listen view: ignoring capture-state change');
        return;
    }
    if (status === "stop" || status === "pause") {
        console.log(`[Renderer] Session ${status === "pause" ? "paused" : "ended"} – stopping local capture`);
        listenCapture.stopCapture();
    } else if (status === "start") {
        console.log('[Renderer] Session started/resumed – starting local capture');
        listenCapture.startCapture();
    }
});
