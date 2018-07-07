import socket
import sys
import time
import threading
import atexit
import yaml
import psycopg2


WATERING_PIN = 15
import RPi.GPIO as io
io.setmode(io.BCM)
io.setup(WATERING_PIN, io.OUT)
io.output(WATERING_PIN, False)

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

WATERING_DURATION = 2

def turnOffWater():
    print("Last ditch attempt to turn off the water tap!")
    io.output(WATERING_PIN, False)
    s.close()
atexit.register(turnOffWater)



class Watering():
    def __init__(self):
        self.isWatering = False


        connected = False
        while not connected:
            try:
                self.creatDbConnection()
                print("Connected!")
                connected = True
            except Exception as e:
                print("Remote Control Server: Unable to connect to DB... Trying again in 10 seconds")
                print(e)
                time.sleep(10)

    def creatDbConnection(self):
        conn_string = "host='{host}' dbname='{db}' user='{username}' password='{password}'".format(host = DB_HOST, db = DB_NAME, username = DB_USERNAME, password = DB_PASSWORD)
        print("DB_CONN_STRING: " + conn_string)

        self.conn = psycopg2.connect(conn_string)
        self.db = self.conn.cursor()

    def doWatering(self, conn):

        if self.isWatering:
            return False

        self.isWatering = True

        # Watering On
        conn.send(str.encode("Starting Watering ({} seconds)....\r\n".format(WATERING_DURATION)))
        
        io.output(WATERING_PIN, True)
        time.sleep(WATERING_DURATION)
        io.output(WATERING_PIN, False)

        # Watering Off
        try:
            conn.send(str.encode("Watering Done\r\n"))
            print("Sent response to connection.")
        except:
            print("Connection closed before a response could be sent!")

        self.isWatering = False

        self.saveToDb()

        return True

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
    conn.send(str.encode('Welcome to the RaspPi Remote Control server. Awaiting commands...\n')) #send only takes string
     
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
                reply = "Watering already in progress\r\n"
                try:
                    conn.sendall(str.encode(reply))
                except:
                    print("Connection closed before reply could be sent.")

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
