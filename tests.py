from Classes.WEntities import WEntities

# Usage: 
# C:\> python manage.py shell
# >>> from tests import TestProjects
# TestProjects().getProjects()

class TestProjects():
    def getProjects(self):
        list = WEntities().get_projects_list()
        print(list) 