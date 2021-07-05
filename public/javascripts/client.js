"use strict";
const socket = io();

const form = document.getElementById("form-message");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input-message");
  socket.emit("chat message", input.value);
  input.value = "";
});

socket.on("chat message", (message) => {
  const messages = document.querySelector(".messages");
  const newMessage = document.createElement("p");
  newMessage.textContent = message;
  messages.appendChild(newMessage);
});
