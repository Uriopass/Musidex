PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS musics
(
    id integer primary key autoincrement
);

CREATE TABLE IF NOT EXISTS tags
(
    music_id integer references musics (id) on delete cascade,
    key      text not null,

    -- all types that a tag can take, 1999 is both a text, an integer and a date, potentially.
    text     text,
    integer  int,
    date     text, -- stored as RFC3339
    vector   blob,

    primary key (music_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tags_text on tags (text);

CREATE TABLE IF NOT EXISTS config
(
    key   text primary key,
    value text not null
);