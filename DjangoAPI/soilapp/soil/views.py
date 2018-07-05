from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import psycopg2
import redis
import json
import time
import yaml


# Create your views here.
from django.http import HttpResponse, JsonResponse

import time


def getConnectionString():
## LOAD CONFIG ##
    CONF = yaml.load(open("../config.yml", "r"))
    DB_HOST = str(CONF["server_ip"])
    DB_NAME = str(CONF["postgres_db"])
    DB_USERNAME = str(CONF["postgres_username"])
    DB_PASSWORD = str(CONF["postgres_password"])
    return "host='{host}' dbname='{db}' user='{username}' password='{password}'".format(host = DB_HOST, db = DB_NAME, username = DB_USERNAME, password = DB_PASSWORD)


def hourly(request):
    
    conn = psycopg2.connect(getConnectionString())
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

    val = r.get("latestDaily")

    return HttpResponse(val)
    


# For Widget
def widgetStatus(request):

    conn = psycopg2.connect(getConnectionString())

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


@csrf_exempt
def sensorStatus(request):
    r = redis.StrictRedis(host='localhost', port=6379, db=0)

    if request.method == 'POST':

        data = json.loads( request.body.decode("utf-8"))


        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')


        newSensorStatus = {
            "ip": ip,
            "timestamp": time.time(),
            "status": data["status"],
        }

        r.set("sensorStatus", json.dumps(newSensorStatus))    


    val = "OK"
    return HttpResponse(val)





@csrf_exempt
def systemStatus(request):
    r = redis.StrictRedis(host='localhost', port=6379, db=0)

    if True:
        
        sensorStatus = r.get("sensorStatus")
        if sensorStatus is None:
            sensorStatus = "Unset"
            latestIP = "0.0.0.0"
        else:
            sensorStatusJson = json.loads(sensorStatus.decode("utf-8"))
            sensorStatus = sensorStatusJson["status"] if (time.time() - sensorStatusJson["timestamp"] < 10) else "Offline"
            latestIP = sensorStatusJson["ip"]



        status = {
           "sensorLastKnownIP": latestIP,
           "sensorStatus": sensorStatus,
           "dataPipelineStatus": "Not implemented"
        }


        val = json.dumps(status)

    return HttpResponse(val)

def index(request):
    r = redis.StrictRedis(host='localhost', port=6379, db=0)

    authToken = request.META.get('Authorization')
    print(authToken)

    val = r.get("latestRealtime")

    return HttpResponse(val)
