"use strict";
const socket = io();

const inputMessage = document.getElementById("input-message");
const modal = document.getElementById("myModal");

const addEventToChannell = (channel) => {
  channel.addEventListener("click", (e) => {
    let roomName = e.target.innerHTML.split(" ")[1];
    // </span>が付いてきたら除去 他に良い方法はあると思う
    roomName = roomName.indexOf("</span>") ? roomName.split("<")[0] : roomName;
    console.log(roomName);
    socket.emit("change room", roomName);
  });
};

// 予約語(connect) 接続時
socket.on("connect", () => {
  socket.emit("enter room", "general");
});

// 切り替えたいチャンネルの名前を送信
document.querySelectorAll(".channel").forEach((channel) => {
  addEventToChannell(channel);
});

socket.on("change room", (channelName) => {
  socket.emit("change room", channelName);
});

// モーダル
const createChannellBtn = document.querySelector(".create-channel");
createChannellBtn.addEventListener("click", () => {
  modal.style.display = "block";
});
document.querySelector(".close").addEventListener("click", () => {
  modal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target == modal) {
    modal.style.display = "none";
  }
});

const inputChannell = document.getElementById("input-channel");
// チャンネル新規作成して送信
document.getElementById("form-channel").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("create channel", inputChannell.value);
  inputChannell.value = "";
});

// チャンネルを追加
socket.on("create channel", (channelName) => {
  const li = document.createElement("li");
  li.className = "channel";
  li.innerHTML = `<span># ${channelName}</span>`;
  addEventToChannell(li);
  document.querySelector(".channel-list").insertBefore(li, createChannellBtn);
  modal.style.display = "none";
});

// 入力中を伝える
inputMessage.addEventListener("input", () => {
  socket.emit("start typing");
});

// メッセージを送信
document.getElementById("form-message").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat message", inputMessage.value);
  inputMessage.value = "";
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
