import socket

__hostname__ = "127.0.0.1"
__port__     = 12321

# max respons length
MAX_MSG_LEN  = 1024*1024 

class TaskClient(object):

  def readAnswer(self, sock):
    chunks = []
    bytes_recd = 0
    while bytes_recd < MAX_MSG_LEN:
      chunk = sock.recv(1024).decode()
      # print("chunk=" + chunk)
      chunks.append(chunk)
      bytes_recd = bytes_recd + len(chunk)
      if len(chunk) < 1024:
        break

    return ''.join(chunks)

  def talkToServer(self, request):
    try:  
      s = socket.socket()
      s.connect((__hostname__, __port__))
      s.send((request + "\n").encode())
      answer = self.readAnswer(s)
      s.close()
    
      return answer
    except Exception as ex:
      return "?"  
