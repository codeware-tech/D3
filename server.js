const { createServer } = require("http");
const express = require("express");
const app = express();
const WebSocket = require("ws");

// make all the files in 'public' available
app.use(express.static("public"));
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/driver.html");
});
app.get("/robot", (request, response) => {
  response.sendFile(__dirname + "/views/robot.html");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
