from django.shortcuts import render
import psycopg2


# Create your views here.
from django.http import HttpResponse, JsonResponse

import time
def index(request):

    #return HttpResponse("Quick")
    #print("starting")
    #start = time.time()

    # Define our connection string
    conn_string = "host='cdevelop.postgres.database.azure.com' dbname='soil' user='chris@cdevelop' password='cDEV2017'"

    # get a connection, if a connect cannot be made an exception will be raised here
    conn = psycopg2.connect(conn_string)

    # conn.cursor will return a cursor object, you can use this cursor to perform queries
    cursor = conn.cursor()

    #print("connected")
    cursor.execute("SELECT * FROM feedone ORDER BY timestamp DESC LIMIT 1")
    
    #print("executed")
    # retrieve the records from the database
    records = cursor.fetchall()


    #print("fetched")
    ret = str(records[0][0]) + "," + str(records[0][1])

    #print("Done: {}".format(time.time() - start))

    return HttpResponse(ret)


def hourly(request):
    
    conn_string = "host='cdevelop.postgres.database.azure.com' dbname='soil' user='chris@cdevelop' password='cDEV2017'"
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT
    	--date_part('hour', TO_TIMESTAMP(timestamp / 1000))
    	avg(value)
    	--, value
    	--, TO_TIMESTAMP(timestamp / 1000)
    	, date_part('hour', TO_TIMESTAMP(timestamp / 1000))
    	, date_part('hour', TO_TIMESTAMP(timestamp / 1000))  || ':00' as label
    	--, date_part('day', TO_TIMESTAMP(timestamp / 1000))::TEXT || lpad(date_part('hour', TO_TIMESTAMP(timestamp / 1000))::TEXT, 2, '0')
    FROM
    	feedone
    WHERE
    	TO_TIMESTAMP(timestamp / 1000) BETWEEN now() - interval '12 hours' AND now()
    GROUP BY
    	date_part('hour', TO_TIMESTAMP(timestamp / 1000))
    	, date_part('day', TO_TIMESTAMP(timestamp / 1000))::TEXT || lpad(date_part('hour', TO_TIMESTAMP(timestamp / 1000))::TEXT, 2, '0')
    ORDER BY
    	date_part('day', TO_TIMESTAMP(timestamp / 1000))::TEXT || lpad(date_part('hour', TO_TIMESTAMP(timestamp / 1000))::TEXT, 2, '0') ASC
    """)
    
    records = cursor.fetchall()
    
    ret = []
    for row in records:
        ret.append({
            "value": row[0],
            "label": row[2],
            "hour": row[1],
        })

    return JsonResponse(ret, safe = False)


def status(request):

    conn_string = "host='cdevelop.postgres.database.azure.com' dbname='soil' user='chris@cdevelop' password='cDEV2017'"

    conn = psycopg2.connect(conn_string)

    cursor = conn.cursor()

    cursor.execute("""
    SELECT
    	avg(value)
    FROM
    	feedone
    WHERE
    	TO_TIMESTAMP(timestamp / 1000) BETWEEN now() - interval '1 hour' AND now()
    """)
    
    records = cursor.fetchall()

    ret = str(records[0][0])

    return HttpResponse(ret)