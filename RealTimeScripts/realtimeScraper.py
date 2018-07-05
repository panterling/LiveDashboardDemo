import psycopg2
import redis
import time
import json
import yaml

## LOAD CONFIG ##
CONF = yaml.load(open("/var/config/config.yml", "r"))
DB_HOST = str(CONF["server_ip"])
DB_NAME = str(CONF["postgres_db"])
DB_USERNAME = str(CONF["postgres_username"])
DB_PASSWORD = str(CONF["postgres_password"])
conn_string = "host='{host}' dbname='{db}' user='{username}' password='{password}'".format(host = DB_HOST, db = DB_NAME, username = DB_USERNAME, password = DB_PASSWORD)


conn = psycopg2.connect(conn_string)

cursor = conn.cursor()

rdb = redis.StrictRedis(host='localhost', port=6379, db=0)

while True:
    cursor.execute("""
        SELECT 
	moisture
        , temperature
	, extract(epoch from timestamp) * 1000 as timestamp
	, stats.min
	, stats.max
	, stats.avg

FROM 
	soilapp 
JOIN (
	SELECT 

		min(moisture) as min
		, max(moisture) as max
		, round(avg(moisture)) as avg
	FROM
		soilapp
	WHERE
		timestamp::DATE = now()::DATE
) stats ON 1 = 1
ORDER BY
	timestamp DESC
LIMIT 1;

	
    """)
    
    records = cursor.fetchall()

    print("m({}) t({})".format(int(records[0][0]), int(records[0][1])))

    ret = {
        "moisture": int(records[0][0]),
        "temperature": int(records[0][1]),
        "timestamp": records[0][2],
        "min": int(records[0][3]),
        "max": int(records[0][4]),
        "avg": int(records[0][5])
    }

    rdb.set("latestRealtime", json.dumps(ret))

    time.sleep(0.5)

