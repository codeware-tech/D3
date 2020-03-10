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
