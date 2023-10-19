import os
import json
import logging


__name__ = "ALGator"

_DEFAULT_HOSTNAME = "localhost"
_DEFAULT_PORT     = 12321

class GlobalConfig(object):

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

        print("Task server used: " + str(self.getTaskServerConnectionData()))
        
        
    def getComputers(self):
        computers = []
        try:
          description_file = open(self.root_path+"/data_root/global_config/config.atgc", 'r').read()
          gJson = json.loads(description_file)    
      
          for fam in gJson["Config"]["ComputerFamilies"]:
              familyID = fam["FamilyID"]
              for comp in fam["Computers"]:
                computers.append(familyID + "." + comp["ComputerID"])
            
        except:
            pass
    
        return computers

    def getTaskServerConnectionData(self):
      name = _DEFAULT_HOSTNAME
      port = _DEFAULT_PORT
      try:
        with open(self.root_path+"/data_root/algator.acfg", 'r') as fde:
          description_file = fde.read()
          
        gJson = json.loads(description_file)    
        
        name = gJson["Config"]["TaskServerName"]
        port = gJson["Config"]["TaskServerPort"]
            
      except:
        pass
    
      return (name, port)



globalConfig = GlobalConfig()