"use strict";
const socket = io();

const inputMessage = document.getElementById("input-message");
const modal = document.getElementById("myModal");
const channel = document.querySelector(".channel");

const changeSelectedColor = (channel) => {
  document.querySelector(".selected").classList.remove("selected");
  channel.classList.add("selected");
};

// クリックしたチャンネルの色を変えて、チャンネル変更を設定
const addEventToChannell = (channel) => {
  channel.addEventListener("click", (e) => {
    changeSelectedColor(e.target);
    const channelId = channel.id.split("channel")[1];
    socket.emit("change channel", channelId);
  });
};

// 予約語(connect) 接続時
socket.on("connect", () => {
  channel.classList.add("selected");
  const channelId = channel.id.split("channel")[1];
  socket.emit("enter channel", channelId);
});

// 切り替えたいチャンネルの名前を送信
document.querySelectorAll(".channel").forEach((channel) => {
  addEventToChannell(channel);
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
  const channelName = inputChannell.value.trim();
  if (channelName === "") {
    alert("文字を入力してください。");
  } else {
    if (channelName.length > 25) {
      alert("25文字より小さくしてください。");
    } else {
      socket.emit("create channel", channelName);
      inputChannell.value = "";
    }
  }
});

// チャンネルを追加
socket.on("create channel", (channelId, channelName) => {
  const li = document.createElement("li");
  li.className = "channel";
  li.id = `channel${channelId}`;
  li.innerHTML = `<span># ${channelName}</span>`;
  addEventToChannell(li);
  document.querySelector(".channel-list").insertBefore(li, createChannellBtn);
  modal.style.display = "none";
});

// 部屋を作った人のチャンネルの色を変える
socket.on("change selectedColor", () => {
  const newChannel =
    document.querySelector(".create-channel").previousElementSibling;
  changeSelectedColor(newChannel);
});

// 入力中を伝える
inputMessage.addEventListener("input", () => {
  socket.emit("start typing");
});

// メッセージを送信
document.getElementById("form-message").addEventListener("submit", (e) => {
  e.preventDefault();
  const messageContent = inputMessage.value.trim();
  if (messageContent === "") {
    alert("文字を入力してください。");
  } else {
    if (messageContent > 255) {
      alert("255文字より小さくしてください。");
    } else {
      socket.emit("chat message", inputMessage.value);
      inputMessage.value = "";
    }
  }
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
