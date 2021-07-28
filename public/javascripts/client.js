"use strict";
const socket = io();

const searchModal = document.getElementById("modal3");
const container = document.querySelector(".container");
const createChannelBtn = document.querySelector(".create-channel");
const channel = document.querySelector(".channel");
const createChannelModal = document.getElementById("modal1");
const rightContent = document.querySelector(".right-content");
const messages = document.querySelector(".messages");
const addStampModal = document.getElementById("modal2");
const form = document.getElementById("form-message");
const imageFile = document.getElementById("file");
const inputMessage = document.getElementById("input-message");
// リアクションをする行を記憶する
let pressedRow = {};

// 新たなチャンネルやユーザが追加されたときに選択肢に現れる
const appendRoomOption = (roomId, roomName, isChannel) => {
  const option = document.createElement("option");
  option.className = "room";
  if (isChannel) {
    option.dataset.channelId = roomId;
    option.value = `#${roomName}`;
    document.querySelector(".select-channels").appendChild(option);
  } else {
    option.dataset.userId = roomId;
    option.value = `@${roomName}`;
    document.querySelector(".select-users").appendChild(option);
  }
};

// 選択された項目の色を切り替える
const changeSelectedColor = (room) => {
  document.querySelector(".selected").classList.remove("selected");
  room.classList.add("selected");
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

// 送信主、メッセージ(messageIdがなければ画像)、スタンプ追加アイコンを表示
const appendMessage = (message, username, messageId, createdAt) => {
  const span = document.createElement("span");
  span.textContent = username;
  const div = document.createElement("div");
  div.className = "message";
  div.appendChild(span);
  const time = document.createElement("time");
  time.textContent = createdAt;
  div.appendChild(time);
  div.dataset.messageId = messageId;
  const p = document.createElement("p");
  p.innerHTML = message;
  div.appendChild(p);

  const reactionIcon = createReactionIcon();
  div.appendChild(reactionIcon);
  messages.appendChild(div);
  rightContent.scrollTo(0, rightContent.scrollHeight);
};

// クリックしたチャンネルの色を変えて、チャンネル変更を伝える
const addEventToChannel = (channel) => {
  channel.addEventListener("click", (e) => {
    changeSelectedColor(e.target);
    const channelId = channel.dataset.channelId;
    socket.emit("change channel", channelId);
  });
};

// クリックしたユーザーの色を変えて、ユーザー変更を伝える
const addEventToDM = (user) => {
  user.addEventListener("click", (e) => {
    changeSelectedColor(e.target);
    socket.emit("change DM", user.dataset.userId);
  });
};

// 画像を貼る
const drawCanvas = (imageData, username) => {
  if (imageData) {
    const img = new Image();
    img.src = imageData;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `<span>${username}</span>`;
      messages.appendChild(div);
      div.appendChild(canvas);
      rightContent.scrollTo(0, rightContent.scrollHeight);
    };
  }
};

document.querySelector(".search-btn").addEventListener("click", () => {
  searchModal.style.display = "block";
  document.getElementById("input").focus();
  container.style.top = "0";
});

// 入力されたチャンネルやユーザに飛ぶ
document.getElementById("input").addEventListener("input", (e) => {
  document.querySelectorAll(".room").forEach((room) => {
    if (e.target.value === room.value) {
      if (room.value.includes("#")) {
        document.querySelectorAll(".channel").forEach((channel) => {
          const channelId = channel.dataset.channelId;
          // datasetは型を変えないとtrueにならない
          if (Number(room.dataset.channelId) === Number(channelId)) {
            changeSelectedColor(channel);
            socket.emit("change channel", channelId);
          }
        });
      } else if (room.value.includes("@")) {
        document.querySelectorAll(".user").forEach((user) => {
          const userId = user.dataset.userId;
          if (Number(room.dataset.userId) === Number(userId)) {
            changeSelectedColor(user);
            socket.emit("change DM", userId);
          }
        });
      }
      searchModal.style.display = "none";
      container.style.top = "38px";
      e.target.value = "";
    }
  });
});

// 予約語(connect) 接続時
socket.on("connect", () => {
  channel.classList.add("selected");
  socket.emit("enter channel", channel.dataset.channelId);
});

// 新規ユーザをサイドバーに足す
socket.on("enter user", (userId, username) => {
  const userCount = document.querySelectorAll(".user").length;
  if (userCount === userId - 1) {
    const li = document.createElement("li");
    li.className = "user";
    li.dataset.userId = userId;
    li.innerHTML = `<span>${username}</span>`;
    addEventToDM(li);
    document.querySelector(".users").appendChild(li);
    appendRoomOption(userId, username, /*isChannel=*/ false);
  }
});

// 過去のメッセージ(+送信主)を表示
socket.on("message history", (messages, username) => {
  document.querySelector(".messages").innerHTML = "";
  messages.forEach((message) => {
    appendMessage(
      message.content,
      message.name,
      message.id,
      message.created_at
    );
  });
});

// 切り替えたいチャンネルの名前を送信
document.querySelectorAll(".channel").forEach((channel) => {
  addEventToChannel(channel);
});

// DM先の選択
document.querySelectorAll(".user").forEach((user) => {
  addEventToDM(user);
});

createChannelBtn.addEventListener("click", () => {
  createChannelModal.style.display = "block";
  document.getElementById("input-channel").focus();
});

const stamps = document.querySelector(".stamp").children;
// スタンプを押すとモーダルが消えて、スタンプが貼られる
for (let i = 0; i < stamps.length; i++) {
  stamps[i].addEventListener("click", (e) => {
    pressedRow.appendChild(e.target.cloneNode(true));
    socket.emit(
      "add reaction",
      pressedRow.dataset.messageId,
      stamps[i].src,
      stamps[i].alt
    );
    addStampModal.style.display = "none";
  });
}

socket.on("add reaction", (messageId, stampUrl, stampName) => {
  const img = document.createElement("img");
  img.src = stampUrl;
  img.alt = stampName;
  document.querySelectorAll(".message").forEach((message) => {
    if (message.dataset.messageId === messageId) {
      message.appendChild(img);
    }
  });
});

// バツボタンを押すとモーダルが消える
document.querySelectorAll(".close").forEach((closeBtn) => {
  closeBtn.addEventListener("click", (e) => {
    createChannelModal.style.display = "none";
    addStampModal.style.display = "none";
    searchModal.style.display = "none";
    container.style.top = "38px";
  });
});

// モーダルの外側をクリックするとモーダルが消える
window.addEventListener("click", (e) => {
  switch (e.target) {
    case createChannelModal:
      createChannelModal.style.display = "none";
      break;
    case addStampModal:
      addStampModal.style.display = "none";
      break;
    case searchModal:
      searchModal.style.display = "none";
      container.style.top = "38px";
      break;
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
  li.dataset.channelId = channelId;
  li.innerHTML = `<span># ${channelName}</span>`;
  addEventToChannel(li);
  document.querySelector(".channel-list").insertBefore(li, createChannelBtn);
  appendRoomOption(channelId, channelName, /*isChannel=*/ true);
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
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const messageContent = inputMessage.value.trim();
  // メッセージ空かつ、ファイルも選択されていない
  if (messageContent === "" && !imageFile.files[0]) {
    alert("文字を入力してください。");
  } else {
    if (messageContent.length > 255) {
      alert("255文字より小さくしてください。");
    } else if (messageContent) {
      const userId = document.querySelector(".selected").dataset.userId;
      if (userId) {
        socket.emit("private message", messageContent, userId);
      } else {
        socket.emit("chat message", messageContent);
      }
      inputMessage.value = "";
    }
  }
});

// メッセージを表示
socket.on("chat message", (message, username) => {
  console.log(message);
  appendMessage(message.content, username, message.id, message.created_at);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (imageFile.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      socket.emit("submit image", imageData);
      const currentUsername = document
        .getElementById("current-username")
        .textContent.split(" ")[0];
      drawCanvas(imageData, currentUsername);
    };
    reader.readAsDataURL(imageFile.files[0]);
    imageFile.value = "";
  }
});

socket.on("submit image", (imageData, username) => {
  drawCanvas(imageData, username);
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
