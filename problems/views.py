import json
from django.template.defaulttags import register
from django.shortcuts import render

from ausers.autools import getUID, isAnonymousMode
from .utils import (getPresentersData,  updateResourcesIfNeeded)

from Classes.WEntities import WEntities 

def project (request, problemName):
    homepoint = request.POST.get('homepoint', False) # ce je True, potem se s klikom na ALGator ikono vračam na ALGator hp, sicer ne

    resultsNavBar = []
    try:
      uid       = getUID(request)
      wentities = WEntities()
      project   = wentities.read_project(problemName, True, uid)
      updateResourcesIfNeeded(project.doc_resources, problemName, uid)

      projectDataDICT = project.json # getProjectData(problemName)
      [presentersDataDICT, presentersDataString] = getPresentersData(projectDataDICT, problemName, uid)

      if "MainProjPresenters" in projectDataDICT:
        for pre in projectDataDICT["MainProjPresenters"]:
          for prst in presentersDataDICT:
            if prst["Name"] == pre:
               resultsNavBar.append({'sectionId': pre, 'shortTitle': prst["ShortTitle"]})
               break
      else:
          return render(request, 'error.html', {'error': f"project '{problemName}' does not exist or can not be read."})
    except Exception as e:
      return render(request, 'error.html', {'error': str(e)})

    navBars = {
        "results": resultsNavBar,
        "projectDescription": [
            {'sectionId': 'problemDescription', 'display': 'Problem Description'},
            {'sectionId': 'testCases',          'display': 'Test cases'},
            {'sectionId': 'testSets',           'display': 'Test sets'},
            {'sectionId': 'projDescAlgorithms', 'display': 'Algorithms'},
            {'sectionId': 'references',         'display': 'References'},
        ],
        "implementation": [
            {'sectionId': 'input',         'display': 'Input'},
            {'sectionId': 'output',        'display': 'Output'},
            {'sectionId': 'algorithm',     'display': 'Algorithm'},
            {'sectionId': 'tools',         'display': 'Tools'},
        ]
    }
 

    context = {
        'isDBMode'  : not isAnonymousMode(),
        'homepoint': homepoint,

        'navBars': navBars,
        'projectDataDICT': projectDataDICT,
        'presentersDataDICT': presentersDataDICT,     # uporabimo za prikaz v html datoteki
        'presentersDataString': presentersDataString, # uporabnimo v js datotekah kjer rabimo json objekte
        
        'project': project,
    }

    return render(request, 'problem.html', context)

def problem(request):
    if request.method == 'POST':
        problemName = request.POST.get('problemName', '')
    else:
        problemName = request.GET.get('problemName', '')
    return project(request, problemName)



@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)