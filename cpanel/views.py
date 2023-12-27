# cpanel/views.py

import subprocess
import os
import json
import base64
 
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.template.context import RequestContext
from django.template.defaulttags import register

from django.http import JsonResponse

from django.views.decorators.csrf import ensure_csrf_cookie

from Classes.Entities import Entities  
from Classes.ServerConnector import connector
from Classes.GlobalConfig import globalConfig


#@login_required
def home(request):

    entities = Entities()

    return render(request,
        'cpindex.html',
        {
            'contentpage'  : 'cplanding.html',
            'projects_list': entities.projects_list,            
        }
    )

#@login_required
def algatorserver(request):

    serverStatus= connector.talkToServer("status")
    tasks       = connector.talkToServer("getTasks")
    
    entities = Entities()
    return render(request,
        'cpindex.html',
        {
          'contentpage'  : 'algatorserver.html',
          'projects_list': entities.projects_list,
          
          'serverStatus': serverStatus,
          'tasks': tasks,
        }
    )

#@login_required
def project(request):

    project = request.GET.get('project', '')
    
    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Project %s" % (jweROOT, project), shell=True)
    
    entities = Entities()
    return render(request,
        'cpindex.html',
        {
          'contentpage'  : 'project.html',        
          'projects_list': entities.projects_list,
          
          'project': project,
          'jweURL': jweURL,
        }
    )


#@login_required
def algorithm(request):

    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    #todo: kaj se zgodi, ce dobim projectName="" ali algorithmName="" 

    entities = Entities()
    for proj in entities.projects_list:
        if proj.name == projectName:
          project = proj
    # todo: kaj se zgodi, ce po koncu te zanke project ni dolocen??

    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Algorithm %s PROJ-%s" % (jweROOT, algorithmName, projectName), shell=True)
    
    computers = globalConfig.getComputers()
    
    path = os.environ["ALGATOR_ROOT"] + "data_root/projects/PROJ-" + projectName + "/results/"
    mtypes = ["em", "cnt", "jvm"]
    results = {}
    for comp in computers:
      for alg in project.algorithms:
        for ts in project.testsets:
            for mtype in mtypes:
               key = comp + "/" + alg.name + "-" + ts.name + "." + mtype
               filename = path + key
               if os.path.isfile(filename):
                  with open(filename) as f:
                    for i, l in enumerate(f):
                      pass
                  desc = "(%d)" % (i+1)
               else:
                   desc = ""
               results[key] = desc

    return render(request,
        'cpindex.html',
        {
          'contentpage'  : 'algorithm.html',        
          'projects_list': entities.projects_list,

        
          'projectName':   projectName,
          'algorithmName': algorithmName,
          'project' : project,
          'jweURL': jweURL,
          'results': results,
          'computers': computers
        }
    )


#@login_required
def results(request):

    file = request.GET.get('file', '')
    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    computer = request.GET.get('comp', '')
    
    try:
      path = globalConfig.root_path + "data_root/projects/PROJ-" + projectName + "/results/" + computer + "/" + file
      cont = open(path, 'r').read()
    except:
      cont = "-- empty --"
    
    entities = Entities()

    return render(request,
        'cpindex.html',
        {
          'contentpage'  : 'showFileCont.html',        
          'projects_list': entities.projects_list,

          'filename':   file + " (%s)" % computer,
          'fileCont': cont,
        }
    )

#@login_required
def history(request):

    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    testset = request.GET.get('testset', '')
    mtype = request.GET.get('mtype', '')

    try:
      file = "%s-%s-%s-%s.history" % (projectName, algorithmName, testset, mtype)            
      path = globalConfig.root_path + "data_root/log/tasks/" + file
      cont = open(path, 'r').read()
    except:
      cont = "-- empty --"
    
    entities = Entities()

    return render(request,
        'cpindex.html',
        {
          'contentpage'  : 'showFileCont.html',        
          'projects_list': entities.projects_list,

          'filename':   file,
          'fileCont': cont,
        }
    )



#@login_required
def runtask(request):
    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    testsetName = request.GET.get('testset', '')
    mType = request.GET.get('mtype', '')

    try:
      taskID = connector.talkToServer("addTask %s %s %s %s" % (projectName, algorithmName, testsetName, mType))    
      answer = connector.talkToServer("taskStatus %s" % (taskID.replace("\n", "")))
    except:
      answer = "Unknown error"
    
    rsp={}
    rsp['answer']=answer
    return JsonResponse(rsp)
 
#@login_required
def askServer(request):
    question = request.GET.get('q', 'status')
    
    return JsonResponse({"answer" : connector.talkToServer(question), "user":request.user.username})

def pAskServer(request):
    question     = request.POST.get('q', 'status')

    return JsonResponse({"answer" : connector.talkToServer(question), "user":request.user.username})


@ensure_csrf_cookie
def savePresenter(request):
    try:
      projName  = request.POST.get('projName', "")
      queryS    = request.POST.get('query', {})
      settingsS = request.POST.get('settings', {})

      query     = json.loads(queryS)
      settings  = json.loads(settingsS)

      try:
        settings["manData"] = json.loads(base64.b64decode(settings["manData"]))
      except:
        settings["manData"] = []

      path      = settings["path"]

      htmlDesc  = base64.b64decode(settings["htmlDesc"])
      htmlPath  = os.path.splitext(path)[0] + ".html"

      del settings["projName"]
      del settings["path"]
      del settings["presenterType"]
      del settings["bindTo"]
      del settings["htmlDesc"]


      settings["Query"]=query

      presenter = {}
      presenter["Presenter"] = settings

      with open(path, 'w') as file:
        file.write(json.dumps(presenter, indent=2, sort_keys=True))

      with open(htmlPath, 'w') as file:
        file.write(htmlDesc)

      msg="Presenter saved to " + path
    except e as Error:
      msg=e
    return JsonResponse({"answer": msg})


@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def concat(arg1, arg2):
    return str(arg1) + str(arg2)

