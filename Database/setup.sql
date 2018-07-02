CREATE TABLE eventtype (
	id INT PRIMARY KEY,
	name TEXT 
);

INSERT INTO eventtype (id, name) VALUES (1, 'WATERING');

CREATE TABLE event (
	id INT PRIMARY KEY,
	eventtypeid INT REFERENCES eventtype (id),
	timestamp TIMESTAMP,
	outcome TEXT
);
