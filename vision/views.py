# vision/views.py
import os
import json
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render
from django.template.context import RequestContext
from django.template.defaulttags import register

from django.http import JsonResponse
from ALGator.taskclient import TaskClient

from Classes.GlobalConfig import GlobalConfig
from Classes.Entities import Entities 

gc = GlobalConfig()

def project(request):
  project_name = request.GET.get('projectName', '')
  debug_arg    = request.GET.get('dbg',         '')
  pid          = request.GET.get('pid',         '')  
  
  if not project_exists(project_name):
    return errorResponse(request, "Missing project directory: " + "PROJ-" + project_name + "...")   

  entities = Entities()
  project = entities.read_project(project_name, True)

  project_params = {}  
  try:
    project_params = get_project_params(project_name)
  except ValueError as e:    # JSON parsing error
    return errorResponse(request, "Syntax error in JSON ({0}): {1}".format(os.path.basename(e.filename), e.message)) 
  except IOError as e:
    return errorResponse(request, "{0}: {1}".format(e.strerror, os.path.basename(e.filename)))

  return render(request,
    'vProject.html',
    {
      'title'   : project_name,
      'project' : project, 
      'params'  : project_params,
      'pid'     : pid,
    }
  )

def openPresenter(request):
  project_name   = request.GET.get('project',   '')
  presenter_name = request.GET.get('presenter', '')
  param          = request.GET.get('param', '')
  
  if not project_exists(project_name):
    return errorResponse(request, "Missing project directory: " + "PROJ-" + project_name + "...")   

  entities  = Entities()
  project   = entities.read_project(project_name, True)
  
  presenter = ""  
  try:
    presenter = project.presenters[presenter_name]
  except:
    None

  project_params = {}  
  try:
    project_params = get_project_params(project_name)
  except IOError as e:
    None

  return render(request,
    'openPresenter.html',
    {
      'project'        : project,
      'presenter'      : presenter,
      'params'         : project_params,
      'param'          : param,
    }
  ) 

def newPresenter(request):
  project_name  = request.POST.get('project',   '')
  tip           = request.POST.get('type',      '0')

  answer = TaskClient().talkToServer("admin -cdp " + project_name + " -pt " + tip)
  
  return JsonResponse({"answer": answer.split("<br>")[-1]})


#@login_required
def chart(request):
  project_name = request.GET.get('project', '')
  query        = request.GET.get('query',   '')
  params       = request.GET.get('params',  '')
  chartid      = request.GET.get('chartid',  '')
  
  return render(request,
    'chart.html',
    {
      'project' : project_name,
      'query'   : query,
      'chartid' : chartid,
      'params'  : params,
    }
  )


def errorResponse(request, msg):
  return render(request,
           'error.html',
           {
             'error'  : msg
           }
  )

def project_exists(project):
    data_root = GlobalConfig().projects_path
    path = "{0}/PROJ-{1}".format(data_root, project)

    return os.path.isdir(path)


def get_project_list():
    """
    Returns algator project list
    """

    projects_dir = os.path.join(GlobalConfig().projects_path, "")
    # gc.logger.error(projects_dir)


    if os.path.isdir(projects_dir):
        project_list = os.listdir(projects_dir)
        return [p.replace("PROJ-", "") for p in project_list]  # strip leading "PROJ-" substring
    else:
        return []  # return empty list if <algator_data_root> directory is missing

def get_project_params(project):
    """
    Returns dictionary containing project input/output parameters
    """
    data_root = GlobalConfig().projects_path
    directory = "{0}/PROJ-{1}/proj".format(data_root, project)  
    
    data = {}

    try:
        filepath =  "{0}/{1}.attc".format(directory, project)    # <project>-em.atrd filepath
        paramOrder = json.loads(open(filepath, "r").read(), strict=False)["TestCase"]["TestCaseParameters"]
        data["Parameters"] = paramOrder
        
        data["Indicators"] = []
        for file in os.listdir(directory):
            if file.startswith(project) and file.endswith(".atrd") and not file.endswith("-em.atrd"):
                filepath = "{0}/{1}".format(directory, file)
                params = json.loads(open(filepath, "r").read(), strict=False)["Result"]["IndicatorsOrder"]
                for param in params:
                    if param not in data["Indicators"]:                        
                        data["Indicators"].append(param)        
    except:  # ValueError as e:
        None
        # e.filename = filepath
        # raise
        
    return data


def fcQueryEditor(request):
  project_name   = request.GET.get('project',   '')

  if not project_exists(project_name):
    return errorResponse(request, "Missing project directory: " + "PROJ-" + project_name + "...")   

  entities  = Entities()
  project   = entities.read_project(project_name, True)
  
  project_params = {}  
  try:
    project_params = get_project_params(project_name)
  except IOError as e:
    None

  return render(request,
    'fcQueryEditor.html',
    {
      'project'        : project,
      'params'         : project_params,
    }
  ) 


@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
