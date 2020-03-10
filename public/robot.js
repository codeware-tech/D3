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

function processSignal(signal) {
  switch (signal.type) {
    case "startCall":
      DRDoubleSDK.sendCommand("webrtc.signal", {
        type: "startCall",
        servers: signal.servers,
        transportPolicy: signal.transportPolicy
      });
      break;

    case "endCall":
      DRDoubleSDK.
      break;
  }

}

function sayHello() {
  socket.send("Hello from robot");
}

// DRDoubleSDK is preloaded in the web view on the robot, so it will show errors on the Glitch.com editor
DRDoubleSDK.resetWatchdog();
window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);
