"use strict";
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const expressLayouts = require("express-ejs-layouts");

app.use(express.static("public"));
// layout.ejsの<%-body%>だけが変わっていく
app.use(expressLayouts);
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("top.ejs");
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});

  socket.on("chat message", (message) => {
    io.emit("chat message", message);
  });
});

const hostname = "127.0.0.1";
const port = 3000;

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
