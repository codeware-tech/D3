import { DriverWebRTC } from './driver_webrtc.js';

var webrtc = null;
var iceConfig = {
  sdpSemantics: "unified-plan",
  iceTransportPolicy: "all",
  iceServers: [
    { urls: [ "stun:rtc-oregon.doublerobotics.com:443" ] },
    {
      urls: [
        "turn:rtc-oregon.doublerobotics.com:443?transport=udp",
        "turn:rtc-oregon.doublerobotics.com:443?transport=tcp",
      ],
      username: "open",
      credential: "open"
    }
  ]
};

// WebSocket

var socket = new WebSocket("wss://" + window.location.hostname);
socket.onopen = function(event) { log("Connected"); };
socket.onclose = function(event) { log("Disconnected"); };
socket.onmessage = function(event) {
  var signal = null;
  try {
    signal = JSON.parse(event.data);
  } catch (e) {
    console.log(event.data);
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

window.sendToServer = (message) => {
  socket.send(JSON.stringify(message));
}

// User Interface

window.startCall = () => {
  webrtc = new DriverWebRTC(iceConfig, log, window.sendToServer, window.hangUpCall);
  window.sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
}

window.hangUpCall = () => {
  webrtc.closeVideoCall();
  window.sendToServer({ type: "endCall" });
}

// Log

var logs = document.querySelector("#logs");
function log(text) {
  if (text && text.name) {
    text = text.name;
  }
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}
