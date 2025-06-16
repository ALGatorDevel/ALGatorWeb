from django.conf import settings

import os
import logging


class GlobalConfig(object):

    # where images are loaded during page edit process
    WEBUPLOAD_FOLDER       = "media/webupload"
    STATIC_UPLOADFILES_REL = WEBUPLOAD_FOLDER
    STATIC_UPLOADFILES_ABS = os.path.join(settings.BASE_DIR,   STATIC_UPLOADFILES_REL)  #  /home/webpagehome/media/webupload

    def __init__(self):
        if 'ALGATOR_ROOT' in os.environ.keys():
            self.root_path = os.environ["ALGATOR_ROOT"]
        else:
            # !DEBUG!
            self.root_path = "/mnt/d/Users/tomaz/OneDrive/ULFRI/ALGATOR_ROOT"

        self.projects_path = self.root_path + "/data_root/projects/"

        filepath = self.root_path + "/data_root/log/web/web.log"
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
 
        # logging
        self.logger = logging.getLogger(__name__)
        hdlr = logging.FileHandler(filepath)
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        hdlr.setFormatter(formatter)
        self.logger.addHandler(hdlr)
        self.logger.setLevel(logging.INFO)
        self.logger.info("ALGator WebPage connected with ALGatorServer " + str(self.getALGatorServerConnectionData()))

        print("ALGatorServer: " + str(self.getALGatorServerConnectionData()))
        print('DB engine: ' + settings.DATABASES['default']['ENGINE'])

    def getALGatorServerConnectionData(self):
      return (settings.ALGATOR_SERVER['Hostname'], settings.ALGATOR_SERVER['Port'])


globalConfig = GlobalConfig()

# create webupload folder if it does not exist
os.makedirs(globalConfig.STATIC_UPLOADFILES_ABS, exist_ok=True)
