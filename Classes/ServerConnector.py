from Classes.GlobalConfig import globalConfig 
import requests
import json, os

from ausers.auconsts import USER_ANONYMOUS
from main.autils import file_to_base64
from main.autils import AutoDeleteArray


class ServerConnector(object):

  def __init__(self):
    # this array is used to prevent multiple file transfer (every file needs to be sent only once in a given period)
    self.sent_files = AutoDeleteArray(expiration_period=24*60*60)

  def get_server_url(self):
    (name, port) = globalConfig.getALGatorServerConnectionData()
    return "http://" + name + ":" + str(port) + "/"

  def talkToServer(self, request, uid=USER_ANONYMOUS):
    try:
      headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "burden": uid
      }

      parts = request.split(' ')
      url =  self.get_server_url() + parts[0]
      parts = parts[1:] 
      data  = ' '.join(parts)
      encoded_data = data.encode("utf-8")

      response = requests.post(url, data=encoded_data, headers=headers)

      return response.text

    except Exception as e:
      return json.dumps({"answer":"TalkToServer error: " + repr(e)})


  def send_static_files_to_server(self, project_name, files_path, file_list):
    status = ""
    sid    = 0    # status id (0=ok)
    try:
      request_url = self.get_server_url() + "uploadstatic"
      headers = {"Content-Type": "multipart/form-data; charset=utf-8"}
      for file_name in file_list:
          if self.sent_files.contains(file_name): continue
          file_content = file_to_base64(os.path.join(files_path, file_name))
          params = json.dumps({'ProjectName': project_name, 'FileName': file_name, 'FileContent': file_content}).encode("utf-8")
          response = requests.post(request_url, data=params, headers=headers)
          if response.status_code == 200:
              status += f"Static file {file_name} moved successfully. "
              self.sent_files.add_element(file_name)
          else:
              status += f"Failed to move static file {file_name}, status code: {response.status_code}. "
      if not status:
          status = "0 static files moved."
    except Exception as e:
      status += "... error " + repr(e)
      sid    = 1

    return sid, status.strip()


connector = ServerConnector()