"use strict";
const socket = io();

const createChannelBtn = document.querySelector(".create-channel");
const channel = document.querySelector(".channel");
const createChannelModal = document.getElementById("modal1");
const addStampModal = document.getElementById("modal2");
const inputMessage = document.getElementById("input-message");
let pressedRow = {};

// 選択されたチャンネルの色を切り替える
const changeSelectedColor = (channel) => {
  document.querySelector(".selected").classList.remove("selected");
  channel.classList.add("selected");
};

// スタンプ作成ボタン
const createReactionIcon = () => {
  const icon = document.createElement("i");
  icon.className = "iconify";
  icon.setAttribute("data-icon", "fe-smile-plus");
  icon.setAttribute("data-inline", "false");
  const span = document.createElement("span");
  span.className = "add-stamp";
  span.appendChild(icon);
  span.addEventListener("click", (e) => {
    pressedRow = e.target.closest(".message");
    addStampModal.style.display = "block";
  });
  return span;
};

// 送信主、メッセージ、スタンプ追加アイコンを表示
const appendMessage = (message, username, messageId) => {
  const span = document.createElement("span");
  span.textContent = username;
  const div = document.createElement("div");
  div.className = "message";
  div.id = `message${messageId}`;
  div.appendChild(span);
  const p = document.createElement("p");
  p.textContent = message;
  div.appendChild(p);
  const reactionIcon = createReactionIcon();
  div.appendChild(reactionIcon);
  document.querySelector(".messages").appendChild(div);
};

// クリックしたチャンネルの色を変えて、チャンネル変更を設定
const addEventToChannel = (channel) => {
  channel.addEventListener("click", (e) => {
    changeSelectedColor(e.target);
    // channel5なら5を取り出す
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

// 過去のメッセージ(+送信主)を表示
socket.on("message history", (messages) => {
  document.querySelector(".messages").innerHTML = "";
  messages.forEach((message) => {
    appendMessage(message.content, message.name, message.id);
  });
});

// 切り替えたいチャンネルの名前を送信
document.querySelectorAll(".channel").forEach((channel) => {
  addEventToChannel(channel);
});

createChannelBtn.addEventListener("click", () => {
  createChannelModal.style.display = "block";
});

const stamps = document.querySelector(".stamp").children;
// スタンプを押すとモーダルが消える
for (let i = 0; i < stamps.length; i++) {
  stamps[i].addEventListener("click", (e) => {
    pressedRow.appendChild(e.target.cloneNode(true));
    // 例 message1 -> 1
    const messageId = pressedRow.id.split("message")[1];
    socket.emit("add reaction", messageId, stamps[i].src, stamps[i].alt);
    addStampModal.style.display = "none";
  });
}

socket.on("add reaction", (messageId, stampUrl, stampName) => {
  const img = document.createElement("img");
  img.src = stampUrl;
  img.alt = stampName;
  document.getElementById(`message${messageId}`).appendChild(img);
});

// バツボタンを押すとモーダルが消える
document.querySelectorAll(".close").forEach((closeBtn) => {
  closeBtn.addEventListener("click", (e) => {
    createChannelModal.style.display = "none";
    addStampModal.style.display = "none";
  });
});

// モーダルの外側をクリックするとモーダルが消える
window.addEventListener("click", (e) => {
  if (e.target === createChannelModal) {
    createChannelModal.style.display = "none";
  } else if (e.target === addStampModal) {
    addStampModal.style.display = "none";
  }
});

const inputChannel = document.getElementById("input-channel");
// チャンネル新規作成して送信
document.getElementById("form-channel").addEventListener("submit", (e) => {
  e.preventDefault();
  const channelName = inputChannel.value.trim();
  if (channelName === "") {
    alert("文字を入力してください。");
  } else {
    if (channelName.length > 20) {
      alert("20文字より小さくしてください。");
    } else {
      socket.emit("create channel", channelName);
      inputChannel.value = "";
    }
  }
});

// チャンネルを追加
socket.on("create channel", (channelId, channelName) => {
  const li = document.createElement("li");
  li.className = "channel";
  li.id = `channel${channelId}`;
  li.innerHTML = `<span># ${channelName}</span>`;
  addEventToChannel(li);
  document.querySelector(".channel-list").insertBefore(li, createChannelBtn);
  createChannelModal.style.display = "none";
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
    if (messageContent.length > 255) {
      alert("255文字より小さくしてください。");
    } else {
      socket.emit("chat message", messageContent);
      inputMessage.value = "";
    }
  }
});

// メッセージを表示
socket.on("chat message", (message, username, messageId) => {
  appendMessage(message, username, messageId);
});

// 入力中を表示
socket.on("start typing", (username) => {
  const typingMessage = document.createElement("div");
  typingMessage.textContent = `${username}が入力中`;
  document.querySelector(".typing").appendChild(typingMessage);
});

// 入力中を消す
socket.on("stop typing", () => {
  document.querySelector(".typing").innerHTML = "";
});
