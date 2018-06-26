import redis
import json
import psycopg2

rdb = redis.StrictRedis(host = 'localhost', port = 6379, db = 0)



conn_string = "host='localhost' dbname='soil' user='chris' password='cDEV2017'"
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
        "value": row[0],
        "label": row[1],
    })



rdb.set("temp_daily", json.dumps(ret))
