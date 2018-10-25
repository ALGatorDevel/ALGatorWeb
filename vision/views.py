# vision/views.py
import os
import json
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.template.defaulttags import register

from Classes.GlobalConfig import GlobalConfig

gc = GlobalConfig()

#@login_required
def index(request):
    
    projects = []
    project_list = get_project_list()
    for p in project_list:
        try:
            projectConfig = get_project_config(p)
            projects.append(projectConfig["Name"])
        except:
            pass

    if len(projects) == 0:
        return render_to_response(
          'error.html',
          {
            'error'  : "No projects found. Make sure algator_data_root is set correctly."
          }
          , context_instance=RequestContext(request)
        )
    else:
        return render_to_response(
          'project_index.html',
          {
            'projects':  projects, 
            'title'   :  "Projects"
          }
          , context_instance=RequestContext(request)
        )

#@login_required
def project(request):
  project_name = request.GET.get('projectName', '')
  debug_arg    = request.GET.get('dbg',         '')
  
  if not project_exists(project_name):
    return errorResponse(request, "Missing project directory: " + "PROJ-" + project_name + "...")   

  project_config = {}
  project_params = {}  
  try:
    project_config = get_project_config(project_name)
    project_params = get_project_params(project_name)
  except ValueError as e:    # JSON parsing error
    return errorResponse(request, "Syntax error in JSON ({0}): {1}".format(os.path.basename(e.filename), e.message)) 
  except IOError as e:
    return errorResponse(request, "{0}: {1}".format(e.strerror, os.path.basename(e.filename)))

  return render_to_response(
    'vProject.html',
    {
      'title'  : project_name,
      'config' : project_config, 
      'params' : project_params,
    }
    , context_instance=RequestContext(request)
  )

#@login_required
def chart(request):
  project_name = request.GET.get('project', '')
  query        = request.GET.get('query',   '')
  params       = request.GET.get('params',  '')
  chartid      = request.GET.get('chartid',  '')
  
  return render_to_response(
    'chart.html',
    {
      'project' : project_name,
      'query'   : query,
      'chartid' : chartid,
      'params'  : params,
    }
    , context_instance=RequestContext(request)
  )


def errorResponse(request, msg):
  return render_to_response(
           'error.html',
           {
             'error'  : msg
           }
           , context_instance=RequestContext(request)
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

def get_project_config(project):
    """
    Returns dictionary containing project configuration
    """
    data_root = GlobalConfig().projects_path
    path = "{0}/PROJ-{1}/proj/{1}.atp".format(data_root, project)  # <project>.atp filepath
    
    try:
        return json.loads(open(path, "r").read(), strict=False)["Project"] 
    except ValueError as e:     # error parsing json
        e.filename = path       # save path and raise
        raise

def get_project_params(project):
    """
    Returns dictionary containing project input/output parameters
    """
    data_root = GlobalConfig().projects_path
    directory = "{0}/PROJ-{1}/proj".format(data_root, project)  
    
    data = {}

    try:
        filepath =  "{0}/{1}-em.atrd".format(directory, project)    # <project>-em.atrd filepath
        paramOrder = json.loads(open(filepath, "r").read(), strict=False)["Result"]["ParameterOrder"]
        data["Parameters"] = paramOrder

        data["Indicators"] = []
        for file in os.listdir(directory):
            if file.startswith(project) and file.endswith(".atrd") and not file.endswith("-em.atrd"):
                filepath = "{0}/{1}".format(directory, file)
                params = json.loads(open(filepath, "r").read(), strict=False)["Result"]["IndicatorOrder"]
                for param in params:
                    if param not in data["Indicators"]:                        
                        data["Indicators"].append(param)

        return data
    except ValueError as e:
        e.filename = filepath
        raise


#@login_required
def test(request):
  return render_to_response(
    'test.html',
    {
        'test'  : 'test'
    }
    , context_instance=RequestContext(request)
  )


@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
