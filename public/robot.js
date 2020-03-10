console.log("robot");

window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);

var socket = new WebSocket("wss://"+ window.location.hostname +"/signaling");

socket.onopen = function (event) {
  socket.send("Hello from robot");
};

socket.onmessage = function (event) {
  console.log(event.data);
}
