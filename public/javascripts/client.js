"use strict";
const socket = io();

const form = document.getElementById("form-message");
const input = document.getElementById("input-message");

// 予約語(connect) 接続時
socket.on("connect", () => {
  socket.emit("enter room", "general");
});

// 切り替えたいチャンネルの名前を送信
document.querySelectorAll(".channell").forEach((channel) => {
  channel.addEventListener("click", (e) => {
    let roomName = e.target.innerHTML.split(" ")[1];
    // </span>が付いてきたら除去 他に良い方法はあると思う
    roomName = roomName.indexOf("</span>") ? roomName.split("<")[0] : roomName;
    socket.emit("change room", roomName);
    console.log(roomName);
  });
});

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

// メッセージを表示
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
