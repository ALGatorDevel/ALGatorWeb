import json

from django.http import QueryDict
from django.template.defaulttags import register
from django.shortcuts import render

from Classes.NEntities import read_project, getValue
from Classes.ServerConnector import connector
from ausers.ausers import try_get_user
from ausers.autools import isAnonymousMode, can
from . import aproblems

def get_computer_familes(request):
    return aproblems.get_computer_familes(request)

def get_project_general_data(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_project_general_data(request, data)

def get_project_properties(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_project_properties(request, data)

def get_project_html_description(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_project_html_description(request, data)

def get_testsets(request):
  data = QueryDict.dict(request.GET)
  return aproblems.get_testsets(request, data)

def get_testset_files(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_testset_files(request, data)

def get_testsets_common_files(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_testsets_common_files(request, data)
def get_testset_file(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_testset_file(request, data)

def remove_testset_file(request):
    data = QueryDict.dict(request.GET)
    return aproblems.remove_testset_file(request, data)

def get_algorithms(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_algorithms(request, data)

def get_presenters(request):
    data = QueryDict.dict(request.GET)
    return aproblems.get_presenters(request, data)


def project (request, problemName):
    homepoint = request.POST.get('homepoint', False) # ce je True, potem se s klikom na ALGator ikono vračam na ALGator hp, sicer ne

    try:
      uid       = try_get_user(request)
      project   = read_project(problemName, uid)

      if (project.get("name", "") != problemName) or not can(uid, getValue(project, "eid", ""), "can_read"):
        return render(request, 'error.html', {'error': 'No project data available due to one of the following reasons: server is down, project configuration files are invalid or access denied.'})

      context = {
        'isDBMode'  : not isAnonymousMode(),
        'homepoint': homepoint,

        'ALGatorServerURL' : connector.get_server_url(),

        'projectPresenters': [],
        'presentersDataDICT': [],
        'presentersDataString': [],


        'project': project,
      }
      return render(request, 'problem.html', context)
    except Exception as e:
      return render(request, 'error.html', {'error': str(e)})


def problem(request):
    if request.method == 'POST':
        problemName = request.POST.get('problemName', '')
    else:
        problemName = request.GET.get('problemName', '')
    return project(request, problemName)



@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)