// Log
var logs = document.querySelector("#logs");
function log(text) {
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

// WebSocket
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

// WebRTC
var constraints = {
  audio: true,
  video: { width: 640, height: 480, frameRate: 30 }
};
var publisherMediaStream = null;
var pc = null;
var transceiver = null;

function startWebcam() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(mediaStream => {
      if (mediaStream) {
        log("getUserMediaFoundMediaStream");

        var video = document.querySelector("#localVideo");
        video.srcObject = mediaStream;
        video.muted = true;
        video.autoplay = true;
        video.onloadedmetadata = function(e) {
          video.play();
        };
        publisherMediaStream = mediaStream;

//         this.createPeerConnection();

//         if (this.pc) {
//           if (this.pc.addTrack !== undefined) {
//             mediaStream
//               .getTracks()
//               .forEach(track => this.pc.addTrack(track, mediaStream));
//             this.sendLog("addingTracksToRTCPeerConnection");
//           } else {
//             this.pc.addStream(mediaStream);
//             this.sendLog("addingStreamToRTCPeerConnection");
//           }
//         }

//         this.acquiredCamera = true;

//         this.drainQueue();
      } else {
        log("getUserMediaMissingMediaStream");
      }
    })
    .catch(e => {
      log(e);
      log("A webcam is required to start a call. Please allow a webcam by clicking on the camera icon in your browser's toolbar, then refresh the page and try again.");
    });
}

function processSignal(signal) {
  switch (signal.type) {
    case "video-offer":  // Invitation and offer to chat
      handleVideoOfferMsg(msg);
      break;

    case "video-answer":  // Callee has answered our offer
      handleVideoAnswerMsg(msg);
      break;

    case "new-ice-candidate": // A new ICE candidate has been received
      handleNewICECandidateMsg(msg);
      break;

    case "hang-up": // The other peer has hung up the call
      handleHangUpMsg(msg);
      break;
  }
}

// Create the RTCPeerConnection which knows how to talk to our
// selected STUN/TURN server and then uses getUserMedia() to find
// our camera and microphone and add that stream to the connection for
// use in our video call. Then we configure event handlers to get
// needed notifications on the call.

async function createPeerConnection() {
  log("Setting up a connection...");

  // Create an RTCPeerConnection which knows to use our chosen
  // STUN server.

  pc = new RTCPeerConnection({
    iceTransportPolicy: "all",
    "iceServers": [
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
    
    iceServers: [     // Information about ICE servers - Use your own!
      {
        urls: "turn:" + myHostname,  // A TURN server
        username: "webrtc",
        credential: "turnserver"
      }
    ]
  });

  // Set up event handlers for the ICE negotiation process.

  pc.onicecandidate = handleICECandidateEvent;
  pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  pc.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  pc.onsignalingstatechange = handleSignalingStateChangeEvent;
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
      name: myUsername,
      target: targetUsername,
      type: "video-offer",
      sdp: pc.localDescription
    });
  } catch(err) {
    log("*** The following error occurred while handling the negotiationneeded event:");
    reportError(err);
  };
}

// Called by the WebRTC layer when events occur on the media tracks
// on our WebRTC call. This includes when streams are added to and
// removed from the call.
//
// track events include the following fields:
//
// RTCRtpReceiver       receiver
// MediaStreamTrack     track
// MediaStream[]        streams
// RTCRtpTransceiver    transceiver
//
// In our case, we're just taking the first stream found and attaching
// it to the <video> element for incoming media.

function handleTrackEvent(event) {
  log("*** Track event");
  document.getElementById("received_video").srcObject = event.streams[0];
  document.getElementById("hangup-button").disabled = false;
}

// Handles |icecandidate| events by forwarding the specified
// ICE candidate (created by our local ICE agent) to the other
// peer through the signaling server.

function handleICECandidateEvent(event) {
  if (event.candidate) {
    log("*** Outgoing ICE candidate: " + event.candidate.candidate);

    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      candidate: event.candidate
    });
  }
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

// Set up a |signalingstatechange| event handler. This will detect when
// the signaling connection is closed.
//
// NOTE: This will actually move to the new RTCPeerConnectionState enum
// returned in the property RTCPeerConnection.connectionState when
// browsers catch up with the latest version of the specification!

function handleSignalingStateChangeEvent(event) {
  log("*** WebRTC signaling state changed to: " + pc.signalingState);
  switch(pc.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}

// Handle the |icegatheringstatechange| event. This lets us know what the
// ICE engine is currently working on: "new" means no networking has happened
// yet, "gathering" means the ICE engine is currently gathering candidates,
// and "complete" means gathering is complete. Note that the engine can
// alternate between "gathering" and "complete" repeatedly as needs and
// circumstances change.
//
// We don't need to do anything when this happens, but we log it to the
// console so you can see what's going on when playing with the sample.

function handleICEGatheringStateChangeEvent(event) {
  log("*** ICE gathering state changed to: " + pc.iceGatheringState);
}
