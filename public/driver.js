var logs = document.querySelector("#logs");
var socket = new WebSocket("wss://" + window.location.hostname);
var publisherMediaStream;

socket.onopen = function(event) {
  log("Connected");
};

socket.onclose = function(event) {
  log("Disconnected");
};

socket.onmessage = function(event) {
  log(event.data);
};

function log(text) {
  console.log(text);
  logs.innerHTML += "<div>" + text + "</div>";
}

function sayHello() {
  socket.send("Hello from robot");
}

function startWebcam() {
  var constraints = {
    audio: true,
    video: { width: 640, height: 480, frameRate: 30 }
  };
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

