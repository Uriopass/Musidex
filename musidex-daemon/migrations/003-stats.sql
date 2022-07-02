PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_listen_stats
(
    user_id  integer references users (id) on delete cascade,
    music_id integer references musics (id) on delete cascade,

    listen_count integer,

    primary key (music_id, user_id)
);