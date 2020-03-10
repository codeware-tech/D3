// Log
var logs = document.querySelector("#logs");
function log(text) {
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

var socket = new WebSocket("wss://" + window.location.hostname);
socket.onopen = function(event) { log("Connected"); };
socket.onclose = function(event) { log("Disconnected"); };
socket.onmessage = function(event) {
  log(event.data);
  var parsed = null;
  try {
    parsed = JSON.parse(event.data);
  } catch (e) { }
  if (parsed) {
    processSignal(parsed);
  }
};

function sendToServer(message) {
  socket.send(JSON.stringify(message));
}

// DRDoubleSDK is preloaded in the web view on the robot, so it will show errors on the Glitch.com editor
if (DRDoubleSDK == "undefined") {
  var DRDoubleSDK = {};
}
DRDoubleSDK.resetWatchdog();
window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);

function processSignal(signal) {
  switch (signal.type) {
    case "endCall":
      DRDoubleSDK.sendCommand("camera.disable");
      DRDoubleSDK.sendCommand("webrtc.disable");
      break;

    case "startCall":
      DRDoubleSDK.sendCommand("webrtc.enable");
      DRDoubleSDK.sendCommand("camera.enable", { template: "h264ForWebRTC" });
      DRDoubleSDK.sendCommand("webrtc.signal", signal);
    default:
      DRDoubleSDK.sendCommand("webrtc.signal", signal);
      break;
  }

}

function sayHello() {
  socket.send("Hello from robot");
}
