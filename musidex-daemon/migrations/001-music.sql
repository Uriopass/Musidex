CREATE TABLE tags_type
(
    name varchar primary key,
    type varchar
);

CREATE TYPE tag AS (
    key varchar,
    value varchar
);

CREATE TABLE music
(
    id int primary key,
    tags tag[] not null
);