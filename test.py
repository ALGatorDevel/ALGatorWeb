from Classes.FolderScraper import FolderScraper  # scrapes different JSON files and puts them together in objects.
from Classes.Project import Project

scraper = FolderScraper()
for proj in scraper.projects_list:
    # @type proj Project
    for alg in proj.algorithms:
        print alg
