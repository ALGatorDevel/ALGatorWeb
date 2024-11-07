from ALGatorWeb import settings
import os
import logging


class GlobalConfig(object):

    # where images are loaded during page edit process
    WEBUPLOAD_FOLDER       = "webupload"
    STATIC_UPLOADFILES_REL = os.path.join(settings.STATIC_URL, WEBUPLOAD_FOLDER)        #  static/webupload
    STATIC_UPLOADFILES_ABS = os.path.join(settings.BASE_DIR,   STATIC_UPLOADFILES_REL)  #  /home/webpagehome/static/webupload

    def __init__(self):
        if 'ALGATOR_ROOT' in os.environ.keys():
            self.root_path = os.environ["ALGATOR_ROOT"]
        else:
            # !DEBUG!
            self.root_path = "/mnt/d/Users/tomaz/OneDrive/ULFRI/ALGATOR_ROOT"

        self.projects_path = self.root_path + "/data_root/projects/"

        # logging
        self.logger = logging.getLogger(__name__)
        hdlr = logging.FileHandler(self.root_path + "/web.log")
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        hdlr.setFormatter(formatter)
        self.logger.addHandler(hdlr)
        self.logger.setLevel(logging.INFO)
        self.logger.info("ALGator WebPage connected with ALGatorServer " + str(self.getALGatorServerConnectionData()))

        print("ALGatorServer: " + str(self.getALGatorServerConnectionData()))

    def getALGatorServerConnectionData(self):
      return (settings.ALGATOR_SERVER['Hostname'], settings.ALGATOR_SERVER['Port'])


globalConfig = GlobalConfig()

# create webupload folder if it does not exist
os.makedirs(globalConfig.STATIC_UPLOADFILES_ABS, exist_ok=True)
