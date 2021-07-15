drop table if exists messages;
drop table if exists channels;
-- drop table if exists users;
create table users (
  id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  name NVARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
create table channels (
  id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  name NVARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO
  channels (name)
VALUES
  ("general"),
  ("random");
create table messages (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    content NVARCHAR(255) NOT NULL DEFAULT "",
    user_id INT NOT NULL,
    channel_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
  );