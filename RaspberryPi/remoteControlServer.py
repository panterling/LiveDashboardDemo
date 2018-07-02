import socket
import sys
import time
import threading
import atexit
import yaml

 
HOST = ''   # Symbolic name, meaning all available interfaces


## LOAD CONFIG ##
CONF = yaml.load(open("../config.yml", "r"))

PORT = str(CONF["sensor_control_port"])
AUTH_TOKEN = str(CONF["auth_token"])
WATER_CMD = str(CONF["sensor_command_water"])
STATUS_CMD = str(CONF["sensor_command_status"])

def turnOffWater():
    print("Last ditch attempt to turn off the water tap!")
    s.close()
atexit.register(turnOffWater)



class Watering():
    def __init__(self):
        self.isWatering = False

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
