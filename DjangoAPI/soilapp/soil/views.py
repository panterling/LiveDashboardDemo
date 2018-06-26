from django.shortcuts import render
import psycopg2
import redis


# Create your views here.
from django.http import HttpResponse, JsonResponse

import time



def hourly(request):
    
    conn_string = "host='localhost' dbname='soil' user='chris' password='cDEV2017'"
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    
    cursor.execute("""
        COMMIT;
        BEGIN;
        SET timezone TO 'UTC-1:00';

        SELECT
        avg(moisture)
        , date_part('hour', timestamp)
        , to_char(timestamp, 'hh AM') as label
    FROM
        soilapp
    WHERE
        timestamp::TIMESTAMP WITH TIME ZONE BETWEEN (now() - interval '1 hours') - interval '12 hours' AND (now() - interval '1 hours')
    GROUP BY
        date_part('hour', timestamp)
        , to_char(timestamp, 'hh AM')
        , date_part('day', timestamp)::TEXT || lpad(date_part('hour', timestamp)::TEXT, 2, '0')
    ORDER BY
        date_part('day', timestamp)::TEXT || lpad(date_part('hour', timestamp)::TEXT, 2, '0') DESC

    """)
    
    records = cursor.fetchall()
    
    ret = []
    for row in records:
        ret.append({
            "moisture": row[0],
            "label": row[2],
            "hour": row[1],
        })

    return JsonResponse(ret, safe = False)

def daily(request):
    r = redis.StrictRedis(host='localhost', port=6379, db=0)

    val = r.get("temp_daily")

    return HttpResponse(val)
    



def status(request):

    conn_string = "host='localhost' dbname='soil' user='chris' password='cDEV2017'"

    conn = psycopg2.connect(conn_string)

    cursor = conn.cursor()

    cursor.execute("""
    SELECT
    	avg(value)
    FROM
    	soilapp
    WHERE
    	timestamp BETWEEN now() - interval '1 hour' AND now()
    """)
    
    records = cursor.fetchall()

    value = records[0][0]

    if value is not None and value > 10500:
        ret = "0" # Thirsty
    else:
        ret = "1"

    return HttpResponse(ret)

def index(request):
    r = redis.StrictRedis(host='localhost', port=6379, db=0)

    val = r.get("temp_realtime")

    return HttpResponse(val)
