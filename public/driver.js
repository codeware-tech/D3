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
      case "offer":  // Invitation and offer to chat
        handleVideoOfferMsg(signal);
        break;

      // case "answer":  // Callee has answered our offer
      //   handleVideoAnswerMsg(signal);
      //   break;

      case "candidate": // A new ICE candidate has been received
        var candidate = new RTCIceCandidate(signal.candidate);
        log("Adding received ICE candidate: " + JSON.stringify(candidate));
        pc.addIceCandidate(candidate);
        break;
    }
  }
};

function sendToServer(message) {
  socket.send(JSON.stringify(message));
}

// WebRTC
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
var webcamStream = null;
var pc = null;
var transceiver = null;

function startCall() {
  sendToServer({
    type: "startCall",
    servers: iceConfig.iceServers,
    transportPolicy: iceConfig.iceTransportPolicy
  });
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
        closeVideoCall();
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
        closeVideoCall();
        break;
    }
  };

  pc.onnegotiationneeded = handleNegotiationNeededEvent;
  pc.ontrack = handleTrackEvent;
}

// Called by the WebRTC layer to let us know when it's time to
// begin, resume, or restart ICE negotiation.

async function handleNegotiationNeededEvent() {
  log("*** Negotiation needed");

  try {
    log("---> Creating offer");
    const offer = await pc.createOffer();

    // If the connection hasn't yet achieved the "stable" state,
    // return to the caller. Another negotiationneeded event
    // will be fired when the state stabilizes.

    if (pc.signalingState != "stable") {
      log("     -- The connection isn't stable yet; postponing...")
      return;
    }

    // Establish the offer as the local peer's current
    // description.

    log("---> Setting local description to the offer");
    await pc.setLocalDescription(offer);

    // Send the offer to the remote peer.

    log("---> Sending the offer to the remote peer");
    sendToServer({
      type: "offer",
      sdp: pc.localDescription
    });
  } catch(err) {
    log("*** The following error occurred while handling the negotiationneeded event: "+ err.message);
  };
}

function handleTrackEvent(event) {
  log("*** Track event");
  document.getElementById("remoteVideo").srcObject = event.streams[0];
  document.getElementById("remoteVideo").controls = true;
  // document.getElementById("hangup").disabled = false;
}


// Handle |iceconnectionstatechange| events. This will detect
// when the ICE connection is closed, failed, or disconnected.
//
// This is called when the state of the ICE agent changes.

function handleICEConnectionStateChangeEvent(event) {
  log("*** ICE connection state changed to " + pc.iceConnectionState);

  switch(pc.iceConnectionState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
  }
}


// Close the RTCPeerConnection and reset variables so that the user can
// make or receive another call if they wish. This is called both
// when the user hangs up, the other user hangs up, or if a connection
// failure is detected.

function closeVideoCall() {
  var localVideo = document.getElementById("localVideo");

  log("Closing the call");

  // Close the RTCPeerConnection

  if (pc) {
    log("--> Closing the peer connection");

    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.

    pc.ontrack = null;
    pc.onnicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.onsignalingstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.onnotificationneeded = null;

    // Stop all transceivers on the connection

    pc.getTransceivers().forEach(transceiver => {
      transceiver.stop();
    });

    // Stop the webcam preview as well by pausing the <video>
    // element, then stopping each of the getUserMedia() tracks
    // on it.

    if (localVideo.srcObject) {
      localVideo.pause();
      localVideo.srcObject.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Close the peer connection

    pc.close();
    pc = null;
    webcamStream = null;
  }

  // Disable the hangup button

  // document.getElementById("hangup-button").disabled = true;
}

function hangUpCall() {
  closeVideoCall();
  sendToServer({ type: "endCall" });
}

// Accept an offer to video chat. We configure our local settings,
// create our RTCPeerConnection, get and attach our local camera
// stream, then create and send an answer to the caller.

async function handleVideoOfferMsg(msg) {
  // If we're not already connected, create an RTCPeerConnection
  // to be linked to the caller.

  log("Received call offer");

  if (!pc) {
    createPeerConnection();
  }

  var desc = new RTCSessionDescription(msg);
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch(err) {
    handleGetUserMediaError(err);
    return;
  }
  document.getElementById("localVideo").srcObject = webcamStream;

  await pc.setRemoteDescription(desc);
  webcamStream.getTracks().forEach(track => pc.addTrack(track, webcamStream));
  await pc.setLocalDescription(await pc.createAnswer());

  log("Sending SDP answer:");
      sendToServer(pc.localDescription);

  // sendToServer({
  //   type: "answer",
  //   sdp: pc.localDescription
  // });
}

function handleGetUserMediaError(e) {
  log(e.name);
  switch(e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone" +
            "were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // Do nothing; this is the same as the user canceling the call.
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }

  // Make sure we shut down our end of the RTCPeerConnection so we're
  // ready to try again.

  closeVideoCall();
}
