import json
from django.template.defaulttags import register
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from .utils import (getProjectData, getPresentersData, getPresenterData, setPresenterData, updateResourcesIfNeeded)
from Classes.ServerConnector import connector

from Classes.WEntities import WEntities 

def project (request, problemName, isEditMode_str='False'):
    homepoint = request.POST.get('homepoint', False) # ce je True, potem se s klikom na ALGator ikono vračam na ALGator hp, sicer ne
    isEditMode = (isEditMode_str.lower() == 'true')

    resultsNavBar = []
    try:
      wentities = WEntities()
      project   = wentities.read_project(problemName, True)
      updateResourcesIfNeeded(project.doc_resources, problemName)


      projectDataDICT = project.json # getProjectData(problemName)
      [presentersDataDICT, presentersDataString] = getPresentersData(projectDataDICT, problemName)
    
      for pre in projectDataDICT["MainProjPresenters"]:
        for prst in presentersDataDICT:
            if prst["Name"] == pre:
               resultsNavBar.append({'sectionId': pre, 'shortTitle': prst["ShortTitle"]})
               break
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
        'isEditMode': isEditMode,
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
        isEditMode_str = request.POST.get('isEditMode', 'False')
    else:
        problemName = request.GET.get('problemName', '')
        isEditMode_str = request.GET.get('isEditMode', 'False')

    return project(request, problemName, isEditMode_str)



@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)