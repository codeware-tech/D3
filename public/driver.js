import { DriverWebRTC } from './driver_webrtc.js';

var webrtc = null;

var logs = document.querySelector("#logs");
function log(text) {
  if (text && text.name) {
    text = text.name;
  }
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

// WebSocket

var socket = new WebSocket("wss://" + window.location.hostname);
socket.onopen = function(event) { log("Connected"); };
socket.onclose = function(event) { log("Disconnected"); };
socket.onmessage = function(event) {
  var signal = null;
  try {
    signal = JSON.parse(event.data);
  } catch (e) {
    console.error(e);
  }

  if (signal) {
    switch (signal.type) {
      case "offer":
        webrtc.handleVideoOffer(signal);
        break;

      case "candidate":
        webrtc.handleCandidate(signal.candidate);
        break;
    }
  }
};

function sendToServer(message) {
  socket.send(JSON.stringify(message));
}

// User Interface

function startCall() {
  webrtc = new DriverWebRTC(log, hangUpCall);
  sendToServer({
    type: "startCall",
    servers: webrtc.iceConfig.iceServers,
    transportPolicy: webrtc.iceConfig.iceTransportPolicy
  });
}

function hangUpCall() {
  webrtc.closeVideoCall();
  sendToServer({ type: "endCall" });
}
