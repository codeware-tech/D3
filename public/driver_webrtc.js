// WebRTC

export function DriverWebRTC(iceConfig, log, sendToServer, hangUpCall) {

  var pc = null;
  var localVideo = document.getElementById("localVideo");
  var remoteVideo = document.getElementById("remoteVideo");
  var webcamStream = null;
  
  this.handleVideoOffer = async (msg) => {
    log("Received call offer");

    webcamStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    pc = new RTCPeerConnection(iceConfig);
    pc.onicecandidate = (event) => this.onicecandidate(event);
    pc.oniceconnectionstatechange = () => this.oniceconnectionstatechange();
    pc.onicegatheringstatechange = () => this.onicegatheringstatechange();
    pc.onsignalingstatechange = () => this.onsignalingstatechange();
    pc.ontrack = (event) => this.ontrack(e);
    // pc.onnegotiationneeded = () => this.onnegotiationneeded();
    
    webcamStream.getTracks().forEach(track => pc.addTrack(track, webcamStream));
    localVideo.srcObject = webcamStream;

    var desc = new RTCSessionDescription(msg);
    await pc.setRemoteDescription(desc);
    await pc.setLocalDescription(await pc.createAnswer());
    sendToServer(pc.localDescription);

    log("Sending SDP answer");
  }

  this.handleCandidate = (candidate) => {
    var candidate = new RTCIceCandidate(candidate);
    log("Adding received ICE candidate: " + JSON.stringify(candidate));
    pc.addIceCandidate(candidate);
  }

  // Called by the WebRTC layer to let us know when it's time to begin, resume, or restart ICE negotiation.

  // async function onnegotiationneeded() {
  //   log("Negotiation needed");

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
  //     log("The following error occurred while handling the negotiationneeded event: "+ err.message);
  //   };
  // }

  this.closeVideoCall = () => {
    log("Closing the call");

    if (pc) {
      log("Closing the peer connection");

      pc.ontrack = null;
      pc.onnicecandidate = null;
      pc.oniceconnectionstatechange = null;
      pc.onsignalingstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.onnotificationneeded = null;

      pc.getSenders().forEach(track => { pc.removeTrack(track); });
      
      if (localVideo.srcObject) {
        localVideo.pause();
        localVideo.srcObject.getTracks().forEach(track => { track.stop(); });
        localVideo.srcObject = null;
      }

      if (remoteVideo) {
        remoteVideo.srcObject = null;
        remoteVideo.controls = false;
      }
      
      pc.close();
      pc = null;
      webcamStream = null;
    }
  }

  // this.handleGetUserMediaError = (e) => {
  //   log(e.name);
  //   switch(e.name) {
  //     case "NotFoundError":
  //       alert("Unable to open your call because no camera and/or microphone were found.");
  //       break;
  //     case "SecurityError":
  //     case "PermissionDeniedError":
  //       // Do nothing; this is the same as the user canceling the call.
  //       break;
  //     default:
  //       alert("Error opening your camera and/or microphone: " + e.message);
  //       break;
  //   }
  //   hangUpCall();
  // }

  this.onicecandidate = (event) => {
    if (event.candidate) {
      log("Outgoing ICE candidate: " + event.candidate.candidate);
      sendToServer({
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    }
  };

  this.oniceconnectionstatechange = () => {
    log("ICE connection state changed to " + pc.iceConnectionState);
    switch(pc.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        hangUpCall();
        break;
    }
  };

  this.onicegatheringstatechange = () => {
    log("ICE gathering state changed to " + pc.iceGatheringState);
  };

  this.onsignalingstatechange = () => {
    log("WebRTC signaling state changed to: " + pc.signalingState);
    switch(pc.signalingState) {
      case "closed":
        hangUpCall();
        break;
    }
  };

  this.ontrack = (event) => {
    log("Track event");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.controls = true;
  };
  
};

export default DriverWebRTC;
