CREATE TABLE IF NOT EXISTS logs (
    id integer primary key autoincrement,
    timestamp text not null,
    user_id integer not null,
    type text not null, -- "user",  "tag", "music"
    action text not null, -- "create", "update", "delete"
    music_id integer, -- nullable
    target_key text, -- tag_key if tag
    target_value text -- tag_value if tag
);