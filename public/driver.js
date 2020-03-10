console.log("driver");

var socket = new WebSocket("signaling", "protocolOne");

socket.onopen = function (event) {
  socket.send("Hello from driver");
};
