import os
import json
import logging


__name__ = "ALGator"


class GlobalConfig(object):

    def __init__(self):
        if 'ALGATOR_ROOT' in os.environ.keys():
          self.root_path = os.environ["ALGATOR_ROOT"]
        else:
          # !DEBUG!
          self.root_path = "/Users/Tomaz/Dropbox/FRI/ALGOSystem/ALGATOR_ROOT"  
        
        self.data_root_path = self.root_path + "/data_root/projects/"
        
        # logging
        self.logger = logging.getLogger(__name__)
        hdlr = logging.FileHandler(self.root_path + "/../ALGatorWeb/web.log")
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')  
        hdlr.setFormatter(formatter)
        self.logger.addHandler(hdlr) 
        self.logger.setLevel(logging.WARNING)
        
        
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

