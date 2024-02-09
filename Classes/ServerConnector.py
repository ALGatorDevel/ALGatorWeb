from Classes.GlobalConfig import globalConfig 
import requests
import json 

class ServerConnector(object):

  def talkToServer(self, request):    
    globalConfig.logger.info("REQUEST: " + request)

    try:
      (name, port) = globalConfig.getALGatorServerConnectionData()
      headers = {"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"}

      parts = request.split(' ')
      url = "http://" + name + ":" + str(port) + "/" + parts[0]
      parts = parts[1:] 
      data  = ' '.join(parts)
      encoded_data = data.encode("utf-8")

      response = requests.post(url, data=encoded_data, headers=headers)

      return response.text

    except Exception as e:
      return json.dumps({"answer":"TalkToServer error: " + repr(e)})

connector = ServerConnector()