"use strict";
const socket = io();

const form = document.getElementById("form-message");
const input = document.getElementById("input-message");

// 入力中を伝える
input.addEventListener("input", () => {
  socket.emit("start typing");
});

// メッセージを送信
form.addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat message", input.value);
  input.value = "";
});

// メッセージを追加
socket.on("chat message", (message) => {
  const newMessage = document.createElement("p");
  newMessage.textContent = message;
  document.querySelector(".messages").appendChild(newMessage);
});

// 入力中を表示
socket.on("start typing", (username) => {
  const typingMessage = document.createElement("div");
  typingMessage.textContent = `${username}が入力中`;
  document.querySelector(".typing").appendChild(typingMessage);
});

socket.on("stop typing", () => {
  document.querySelector(".typing").innerHTML = "";
});
