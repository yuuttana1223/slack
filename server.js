"use strict";
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcrypt");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "slack",
});

const sessionMiddleware = session({
  secret: "secret",
  resave: false,
  saveUninitialized: false,
});
app.session = sessionMiddleware;
app.use(sessionMiddleware);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});

app.get("/users/signup", (req, res) => {
  res.render("users/signup.ejs", { errors: [], user: {} });
});

app.post(
  "/users/signup",
  (req, res, next) => {
    const user = {
      name: req.body.username,
      email: req.body.email,
    };
    const password = req.body.password;
    const passwordConfirmation = req.body.password_confirmation;
    const errors = [];

    if (user.name === "") errors.push("ユーザー名が空です。");
    if (user.name.length > 20) errors.push("ユーザー名は２０文字以内です。");
    if (user.email === "") errors.push("メールアドレスが空です。");
    if (user.email.length > 255)
      errors.push("メールアドレスは２５５文字以内です。");
    if (password === "") errors.push("パスワードが空です。");
    if (password.length > 30) errors.push("パスワードは３０文字以内です。");
    if (passwordConfirmation !== password)
      errors.push("パスワードが一致していません。");
    if (errors.length > 0) {
      res.render("users/signup.ejs", { errors: errors, user: user });
    } else {
      next();
    }
  },
  (req, res, next) => {
    // メールアドレスの重複チェック
    const user = {
      name: req.body.username,
      email: req.body.email,
    };
    connection.execute(
      "SELECT * FROM users WHERE email = ?;",
      [user.email],
      (error, results) => {
        if (results.length > 0) {
          res.render("users/signup.ejs", {
            errors: ["既に同じメールアドレスが登録されています。"],
            user: user,
          });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    // ユーザーをデータベースに登録
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => {
      connection.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?);",
        [username, email, hash],
        (error, results) => {
          req.session.userId = results.insertId;
          req.session.username = username;
          res.redirect("/");
        }
      );
    });
  }
);

app.get("/users/signin", (req, res) => {
  res.render("users/signin.ejs", { errors: [], email: "" });
});

app.post("/users/signin", (req, res) => {
  const email = req.body.email;
  connection.execute(
    "SELECT * FROM users WHERE email = ?;",
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;

        bcrypt.compare(plain, hash, (errror, isEqual) => {
          if (isEqual) {
            req.session.userId = results[0].id;
            req.session.username = results[0].name;
            res.redirect("/");
          } else {
            res.render("users/signin.ejs", {
              errors: ["パスワードが正しくありません。"],
              email: email,
            });
          }
        });
      } else {
        res.render("users/signin.ejs", {
          errors: ["メールアドレスが正しくありません。"],
          email: email,
        });
      }
    }
  );
});

app.post("/users/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/users/login");
  });
});

app.get("/", (req, res) => {
  if (req.session.username) {
    connection.execute("SELECT * FROM channels;", (error, results) => {
      res.render("top.ejs", { channels: results });
    });
  } else {
    res.redirect("/users/signin");
  }
});

io.use((socket, next) => {
  // セッションをsocket上で使えるようにする
  app.session(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  const { username, userId } = socket.request.session;

  const changeChannel = (channelId) => {
    socket.leave(socket.channelId);
    socket.channelId = channelId;
    socket.join(socket.channelId);
  };

  socket.on("enter channel", (channelId) => {
    connection.execute(
      "SELECT * FROM messages WHERE channel_id = ?;",
      [channelId],
      (error, results) => {
        if (error) {
          console.log(errror);
        } else {
          socket.channelId = channelId;
          socket.join(socket.channelId);
        }
      }
    );
  });

  socket.on("change channel", (channelId) => {
    changeChannel(channelId);
  });

  // チャンネル新規作成
  socket.on("create channel", (channelName) => {
    connection.execute(
      "INSERT INTO channels (name) VALUES (?);",
      [channelName],
      (error, results) => {
        if (error) {
          console.log(error);
        } else {
          io.emit("create channel", results.insertId, channelName);
          // 部屋を作った人はその部屋に行く
          changeChannel(`${results.insertId}`);
          socket.emit("change selectedColor");
        }
      }
    );
  });

  // socket.on("disconnect", () => {});
  // 送信されたメッセージを全員に送信
  socket.on("chat message", (message) => {
    connection.execute(
      "INSERT INTO messages (content, user_id, channel_id) VALUES (?, ?, ?);",
      [message, userId, socket.channelId]
    );
    io.to(socket.channelId).emit("chat message", message);
  });

  // 入力中を自分以外に伝える
  let notTyping = 0; // イベントを受信した回数
  socket.on("start typing", () => {
    if (notTyping <= 0) {
      socket.broadcast.to(socket.channelId).emit("start typing", `${username}`);
    }
    notTyping++;
    // 3秒経っても入力がなかったら終了イベントを送信
    setTimeout(() => {
      notTyping--;
      if (notTyping <= 0) {
        socket.broadcast.emit("stop typing");
      }
    }, 3000);
  });
});

const hostname = "127.0.0.1";
const port = 3000;

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
