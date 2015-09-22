import socket

__hostname__ = "127.0.0.1"
__port__     = 12321

class TaskClient(object):

  def talkToServer(self, request):
    try:  
      s = socket.socket()
      s.connect((__hostname__, __port__))
    
      s.send(request + "\n")
      answer = s.recv(10240)
    
      return answer
    except:
      return "?"  
