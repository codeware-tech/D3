import('driver_webrtc.js').then(({ test }) => {
  // your code
});

// Log

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
    log(event.data);
  }

  if (signal) {
    switch (signal.type) {
      case "offer":
        handleVideoOffer(signal);
        break;

      case "candidate":
        handleCandidate(signal.candidate);
        break;
    }
  }
};

function sendToServer(message) {
  socket.send(JSON.stringify(message));
}

// User Interface

function startCall() {
  sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
}

function hangUpCall() {
  closeVideoCall();
  sendToServer({ type: "endCall" });
}
