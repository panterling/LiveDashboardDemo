import redis
import json
import psycopg2
import yaml

rdb = redis.StrictRedis(host = 'localhost', port = 6379, db = 0)


## LOAD CONFIG ##
CONF = yaml.load(open("/var/config/config.yml", "r"))
DB_HOST = str(CONF["server_ip"])
DB_NAME = str(CONF["postgres_db"])
DB_USERNAME = str(CONF["postgres_username"])
DB_PASSWORD = str(CONF["postgres_password"])
conn_string = "host='{host}' dbname='{db}' user='{username}' password='{password}'".format(host = DB_HOST, db = DB_NAME, username = DB_USERNAME, password = DB_PASSWORD)



conn = psycopg2.connect(conn_string)
cursor = conn.cursor()

cursor.execute("""
SELECT
    avg(moisture)
    --, to_char(TO_TIMESTAMP(timestamp / 1000)::TIMESTAMP WITH TIME ZONE, 'YYYYMMDD')::NUMERIC
    , to_char(timestamp::TIMESTAMP WITH TIME ZONE, 'day') as label
FROM
    soilapp
WHERE
    timestamp::TIMESTAMP WITH TIME ZONE BETWEEN (now() - interval '1 day') - interval '7 days' AND (now() - interval '1 day')
GROUP BY
    to_char(timestamp::TIMESTAMP WITH TIME ZONE, 'YYYYMMDD')::NUMERIC
    ,to_char( timestamp::TIMESTAMP WITH TIME ZONE, 'day')
ORDER BY
    to_char(timestamp::TIMESTAMP WITH TIME ZONE, 'YYYYMMDD')::NUMERIC DESC
""")

records = cursor.fetchall()

ret = []
for row in records:
    ret.append({
        "value": int(row[0]),
        "label": row[1],
    })



rdb.set("latestDaily", json.dumps(ret))
