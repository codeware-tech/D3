var logs = document.querySelector("#logs");
var socket = new WebSocket("wss://"+ window.location.hostname);

socket.onopen = function (event) {
  logs.innerHTML += "<div>Connected</div>";
};

socket.onclose = function (event) {
  logs.innerHTML += "<div>Disconnected</div>";
};

socket.onmessage = function (event) {
  logs.innerHTML += "<div>"+ event.data +"</div>";
}

function sayHello() {
  socket.send("Hello from robot");
}

// DRDoubleSDK is preloaded in the web view on the robot, so it will show errors on the Glitch.com editor
DRDoubleSDK.resetWatchdog();
window.setInterval(() => {
  DRDoubleSDK.resetWatchdog();
  DRDoubleSDK.sendCommand("screensaver.nudge");
}, 2000);
