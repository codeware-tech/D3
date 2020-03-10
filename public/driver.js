console.log("driver");

var socket = new WebSocket("wss://"+ window.location.hostname +"/signaling");

socket.onopen = function (event) {
  socket.send("Hello from driver");
};

socket.onmessage = function (event) {
  console.log(event.data);
}
