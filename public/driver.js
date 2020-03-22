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
  document.getElementById("hangup").disabled = false;
  document.getElementById("start").disabled = true;
  sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
}

function hangUpCall() {
  closeVideoCall();
  sendToServer({ type: "endCall" });
  document.getElementById("hangup").disabled = true;
  document.getElementById("start").disabled = false;
}

// WebRTC

var pc = null;
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

async function handleVideoOffer(msg) {
  log("Received call offer");

  var webcamStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  createPeerConnection();
  webcamStream.getTracks().forEach(track => pc.addTrack(track, webcamStream));
  document.getElementById("localVideo").srcObject = webcamStream;

  var desc = new RTCSessionDescription(msg);
  await pc.setRemoteDescription(desc);
  await pc.setLocalDescription(await pc.createAnswer());
  sendToServer(pc.localDescription);

  log("Sending SDP answer");
}

async function createPeerConnection() {
  log("Creating peer connection");

  pc = new RTCPeerConnection(iceConfig);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      log("*** Outgoing ICE candidate: " + event.candidate.candidate);
      sendToServer({
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    }
  };

  pc.oniceconnectionstatechange = () => {
    log("*** ICE connection state changed to " + pc.iceConnectionState);
    switch(pc.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        hangUpCall();
        break;
    }
  };

  pc.onicegatheringstatechange = () => {
    log("*** ICE gathering state changed to " + pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    log("*** WebRTC signaling state changed to: " + pc.signalingState);
    switch(pc.signalingState) {
      case "closed":
        hangUpCall();
        break;
    }
  };

  pc.ontrack = (event) => {
    log("*** Track event");
    document.getElementById("remoteVideo").srcObject = event.streams[0];
    document.getElementById("remoteVideo").controls = true;
  };

  // pc.onnegotiationneeded = handleNegotiationNeededEvent;
}

function handleCandidate(candidate) {
  var candidate = new RTCIceCandidate(candidate);
  log("Adding received ICE candidate: " + JSON.stringify(candidate));
  pc.addIceCandidate(candidate);
}

// Called by the WebRTC layer to let us know when it's time to begin, resume, or restart ICE negotiation.

// async function handleNegotiationNeededEvent() {
//   log("*** Negotiation needed");

//   try {
//     log("---> Creating offer");
//     const offer = await pc.createOffer();

//     // If the connection hasn't yet achieved the "stable" state,
//     // return to the caller. Another negotiationneeded event
//     // will be fired when the state stabilizes.

//     if (pc.signalingState != "stable") {
//       log("     -- The connection isn't stable yet; postponing...")
//       return;
//     }

//     // Establish the offer as the local peer's current
//     // description.

//     log("---> Setting local description to the offer");
//     await pc.setLocalDescription(offer);

//     // Send the offer to the remote peer.

//     log("---> Sending the offer to the remote peer");
//     sendToServer({
//       type: "offer",
//       sdp: pc.localDescription
//     });
//   } catch(err) {
//     log("*** The following error occurred while handling the negotiationneeded event: "+ err.message);
//   };
// }

function closeVideoCall() {
  log("Closing the call");

  if (pc) {
    log("Closing the peer connection");

    pc.ontrack = null;
    pc.onnicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.onsignalingstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.onnotificationneeded = null;

    pc.getTracks().forEach(track => { track.stop(); });

    var localVideo = document.getElementById("localVideo");
    if (localVideo.srcObject) {
      localVideo.pause();
      localVideo.srcObject.getTracks().forEach(track => { track.stop(); });
    }

    pc.close();
    pc = null;
  }
}

function handleGetUserMediaError(e) {
  log(e.name);
  switch(e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // Do nothing; this is the same as the user canceling the call.
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }
  hangUpCall();
}
