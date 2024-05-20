from ALGatorWeb import settings
import os

class GlobalConfig(object):

    # where images are loaded during page edit process
    WEBUPLOAD_FOLDER       = "webupload"
    STATIC_UPLOADFILES_REL = os.path.join(settings.STATIC_URL, WEBUPLOAD_FOLDER)        #  static/webupload
    STATIC_UPLOADFILES_ABS = os.path.join(settings.BASE_DIR,   STATIC_UPLOADFILES_REL)  #  /home/webpagehome/static/webupload
  

    def getALGatorServerConnectionData(self):
      return (settings.ALGATOR_SERVER['Hostname'], settings.ALGATOR_SERVER['Port'])


globalConfig = GlobalConfig()

# create webupload folder if it does not exist
os.makedirs(globalConfig.STATIC_UPLOADFILES_ABS, exist_ok=True)
