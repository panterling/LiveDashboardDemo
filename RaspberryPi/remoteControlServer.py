import socket
import sys
import time
import threading
import atexit
import yaml
import psycopg2

 
HOST = ''   # Symbolic name, meaning all available interfaces


## LOAD CONFIG ##
CONF = yaml.load(open("../config.yml", "r"))

PORT = int(CONF["sensor_control_port"])

AUTH_TOKEN = str(CONF["auth_token"])
WATER_CMD = str(CONF["sensor_command_water"])
STATUS_CMD = str(CONF["sensor_command_status"])

DB_HOST = str(CONF["server_ip"])
DB_NAME = str(CONF["postgres_db"])
DB_USERNAME = str(CONF["postgres_username"])
DB_PASSWORD = str(CONF["postgres_password"])

def turnOffWater():
    print("Last ditch attempt to turn off the water tap!")
    s.close()
atexit.register(turnOffWater)



class Watering():
    def __init__(self):
        self.isWatering = False

        conn_string = "host='{host}' dbname='{db}' user='{username}' password='{password}'".format(host = DB_HOST, db = DB_NAME, username = DB_USERNAME, password = DB_PASSWORD)
        print("DB_CONN_STRING: " + conn_string)
        self.conn = psycopg2.connect(conn_string)
        self.db = self.conn.cursor() 

    def doWatering(self, conn):

        if self.isWatering:
            return False

        self.isWatering = True

        # Watering On
        conn.send(str.encode("Starting Watering (5 seconds)...."))
        
        # io.output(WATERING_PIN, True)
        time.sleep(5)
        # io.output(WATERING_PIN, False)

        # Watering Off
        conn.send(str.encode("Watering Done"))

        self.isWatering = False

        self.saveToDb()

    def saveToDb(self):
        print("Saving event to DB...")
        try:
            self.db.execute("INSERT INTO event (eventtypeid, timestamp, outcome) VALUES (1, now(), 'OK')")
            self.conn.commit()
            print("    Saved!")
        except Exception as e:
            print(e)


wateringObj = Watering()







#Function for handling connections. This will be used to create threads
def clientthread(conn):

    global wateringObj

    #Sending message to connected client
    conn.send(str.encode('Welcome to the server. Type something and hit enter\n')) #send only takes string
     
    #infinite loop so that function do not terminate and thread do not end.
    while True:
         
        #Receiving from client
        data = conn.recv(1024)
        data = data.decode("utf-8")
        reply = 'Rx: ' + data

        print(data)

        if not data: 
            break
        elif data.rstrip("\n\r") == AUTH_TOKEN+STATUS_CMD:
            conn.send(str.encode("1"))
        elif data.rstrip("\n\r") == AUTH_TOKEN+WATER_CMD:
            if not wateringObj.doWatering(conn):
                reply = "Watering already in progress"
                conn.sendall(str.encode(reply))
            # else: conn passed to Thread - no longer safe to use....
     
    #came out of loop
    conn.close()







s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print("Socket created")
 
#Bind socket to local host and port
try:
    s.bind((HOST, PORT))
except socket.error as msg:
    print("Bind failed. Error Code : " + str(msg[0]) + ' Message ' + msg[1])
    sys.exit()
     
print('Socket bind complete')
 
#Start listening on socket
s.listen(10)
print('Socket now listening')
 
#now keep talking with the client
while 1:
    #wait to accept a connection - blocking call
    conn, addr = s.accept()
    print('Connected with ' + addr[0] + ':' + str(addr[1]))

    t = threading.Thread(target = clientthread, args = (conn,))
    t.start()

     
s.close()
