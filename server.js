const { createServer } = require("http");
const express = require("express");
const WebSocket = require("ws");

// Configure express for serving files
const app = express();
app.use(express.json({ extended: false }));
app.use(express.static("public"));
app.use("/signaling", require("./signaling.js"));
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/driver.html");
});
app.get("/robot", (request, response) => {
  response.sendFile(__dirname + "/views/robot.html");
});

// Launch express server
const server = createServer(app);
server.listen(process.env.PORT, () => {
  console.info(`Server running on port: ${process.env.PORT}`);
});

// Launch websocket server
const webSocketServer = new WebSocket.Server({ server });
webSocketServer.on("connection", (webSocket) => {

    console.info("Total connected clients:", webSocketServer.clients.size);

    app.locals.clients = webSocketServer.clients;
});
