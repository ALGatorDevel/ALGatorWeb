from Classes.GlobalConfig import globalConfig 
import requests
import json 

class ServerConnector(object):

  def talkToServer(self, request):    
    try:
      (name, port) = globalConfig.getALGatorServerConnectionData()
      parts = request.split(' ')
      url = "http://" + name + ":" + str(port) + "/" + parts[0]
      parts = parts[1:] 

      response = requests.post(url, ' '.join(parts))

      return response.text

    except Exception as e:
      return json.dumps({"answer":"TalkToServer error: " + repr(e)})

connector = ServerConnector()