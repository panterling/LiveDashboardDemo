import socket
import sys
import time
import threading
import atexit

 
HOST = ''   # Symbolic name, meaning all available interfaces
PORT = 8888 # Arbitrary non-privileged port
 
WATER_CMD = "W"



def turnOffWater():
    print("Last ditch attempt to turn off the water tap!")
atexit.register(turnOffWater)


#Function for handling connections. This will be used to create threads
def clientthread(conn):
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
        elif data[0] == WATER_CMD:
            # Watering On
            conn.send(str.encode("Starting Watering (5 seconds)...."))
            
            # Wait
            time.sleep(5)
            
            # Watering Off
            conn.send(str.encode("Done"))

            
     
        conn.sendall(str.encode(reply))
     
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
