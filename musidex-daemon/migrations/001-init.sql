CREATE TABLE tags
(
    music_id int references music(id),
    key text not null,

    -- all types that a tag can take, 1999 is both a text, an integer and a date, potentially.
    text text,
    integer int,
    date timestamptz,
    vector bytea,

    primary key (music_id, key)
);

CREATE INDEX ON tags (music_id);

CREATE TABLE music
(
    id int primary key
);

CREATE TABLE sources
(
    music_id int references music(id),

    -- the format of the source, could be "local_ogg", "local_mp3", "youtube_link"
    format text,
    url text,
    primary key (music_id, format)
);

CREATE TABLE config
(
    key text primary key,
    value text not null
);