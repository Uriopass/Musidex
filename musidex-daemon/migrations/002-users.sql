PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users
(
    id integer primary key autoincrement,
    name text non null
);

INSERT INTO users (id, name) VALUES (1, 'default');

INSERT INTO tags (music_id, key)
SELECT id, 'user_library:1'
FROM musics;