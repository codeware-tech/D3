console.log("robot");
var logs = document.querySelector("#logs");

DRDoubleSDK.resetWatchdog();
window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);

var socket = new WebSocket("wss://"+ window.location.hostname +"/signaling");

socket.onopen = function (event) {
  socket.send("Hello from robot");
};

socket.onmessage = function (event) {
  logs.innerHTML += "<div>"+ event.data +"</div>";
}
