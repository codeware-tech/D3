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
socket.onopen = function(event) { log("Connected to server"); };
socket.onclose = function(event) { log("Disconnected from server"); };
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
};

// User Interface

var cameras = document.getElementById("cameras");
var mics = document.getElementById("mics");
var localVideo = document.getElementById("localVideo");
var urlBox = document.getElementById("urlBox");

if (window.location.host == "d3-webrtc-example.glitch.me") {
  urlBox.value = "Do step 1 first!";
} else {
  urlBox.value = "https://"+ window.location.host +"/robot";
}

window.listWebcams = () => {
  window.endLocalVideo();
  
  navigator.mediaDevices.enumerateDevices()
  .then(function (devices) {
    devices.forEach(function(device) {
      var option = document.createElement("option");
      option.value = device.deviceId;
      option.innerText = device.label;
      if (device.kind == "videoinput") {
        cameras.appendChild(option);
      } else if (device.kind == "audioinput") {
        mics.appendChild(option);
      }
    });
    
    window.updateLocalVideo();
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });
};

function clearWebcams() {
  cameras.innerHTML = "";
  mics.innerHTML = "";
}

function stopLocalVideo() {
  if (localVideo.srcObject) {
    localVideo.pause();
    localVideo.srcObject.getTracks().forEach(track => { track.stop(); });
    localVideo.srcObject = null;
  }
}

window.endLocalVideo = () => {
  clearWebcams();
  stopLocalVideo();
}

window.updateLocalVideo = () => {
  navigator.mediaDevices.getUserMedia({
    audio: { deviceId: mics.value },
    video: { deviceId: cameras.value }
  })
  .then(function (stream) {
    stopLocalVideo();
    localVideo.srcObject = stream;
  });
}

window.startCall = () => {
  webrtc = new DriverWebRTC(iceConfig, log, window.sendToServer, window.hangUpCall);
  window.sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
  clearWebcams();
};

window.hangUpCall = () => {
  webrtc.closeVideoCall();
  window.endLocalVideo();
  window.sendToServer({ type: "endCall" });
};

// Log

var logs = document.querySelector("#logs");
function log(text) {
  if (text && text.name) {
    text = text.name;
  }
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}
