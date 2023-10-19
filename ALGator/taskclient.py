import socket
from Classes.GlobalConfig import globalConfig 
import base64
import time


# max respons length
MAX_MSG_LEN  = 1024*1024 

class TaskClient(object):

  # In this method we use non-blocking socket.recv() method; to get whole message,
  # and not block for too long, we use timeout; default value of timer is currently 
  # set to 0.25s; if this will cause some problems, value could be increased.
  # Method was adapted from https://www.binarytides.com/receive-full-data-with-the-recv-socket-function-in-python/
  def readAnswerX(self, the_socket,timeout=0.25):
    the_socket.setblocking(0)
    total_data=[];
    data='';
    
    begin=time.time()
    while 1:
        if total_data and time.time()-begin > timeout:
            break        
        elif time.time()-begin > timeout*2:
            break
        
        try:
            data = the_socket.recv(8192)
            if data:
                total_data.append(data.decode())
                begin=time.time()
            else:
                time.sleep(0.1)
        except:
            pass
    
    return base64.b64decode(''.join(total_data)).decode('utf-8')

  # this method sometimes returns only a part of a message; this error occures,
  # when the server and the client are on different machines;  to overcome this 
  # problem, use readAnswerX method instead
  def readAnswer(self, sock):
    result = ""
    try:
      chunks = []
      bytes_recd = 0
      while bytes_recd < MAX_MSG_LEN:
        chunkd = sock.recv(1024)
        chunk  = chunkd.decode()
        chunks.append(chunk)
        bytes_recd = bytes_recd + len(chunk)

        if len(chunkd) < 1024:
          break
      result = ''.join(chunks)

      result = base64.b64decode(result).decode('utf-8')
    
    except:
      pass

    return result

  def talkToServer(self, request):
    try:  
      nameANDport = globalConfig.getTaskServerConnectionData()
      s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
      s.connect(nameANDport)

      request = base64.b64encode(request.encode("utf-8")).decode()
      s.send((request + "\n").encode())
      
      answer = self.readAnswer(s)
      s.close()
    
      return answer
    except Exception as ex:
      return str(ex) 
