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
// ejsでpostのときに必要
app.use(express.urlencoded({ extended: false }));
// layout.ejsの<%-body%>内だけが変わっていく

// socketで使うログインユーザー
const currentUser = {};

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "slack",
});

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});

app.get("/", (req, res) => {
  if (req.session.username) {
    res.render("top.ejs");
  } else {
    res.redirect("/users/signin");
  }
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
      errors.push("ユーザー名は２５５文字以内です。");
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
    connection.query(
      "SELECT * FROM users WHERE email = ?",
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
      connection.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [username, email, hash],
        (error, results) => {
          console.log(results);
          req.session.userId = results.insertId;
          req.session.username = username;
          currentUser.id = results.insertId;
          currentUser.name = username;
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
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;

        bcrypt.compare(plain, hash, (errror, isEqual) => {
          if (isEqual) {
            req.session.userId = results[0].id;
            req.session.username = results[0].name;
            currentUser.id = results[0].id;
            currentUser.name = results[0].name;
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

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
  // 送信されたメッセージを全員に送信
  socket.on("chat message", (message) => {
    io.emit("chat message", message);
  });

  // 入力中を自分以外に伝える
  let notTyping = 0; // イベントを受信した回数
  socket.on("start typing", () => {
    if (notTyping <= 0) {
      socket.broadcast.emit("start typing", `${currentUser.name}`);
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
