DROP TABLE IF EXISTS campgrounds CASCADE;

CREATE TABLE campgrounds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO campgrounds (name) VALUES ('Whitewater Memorial State Park, IN');