# cpanel/views.py

import subprocess
import os

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.template.defaulttags import register

from django.http import JsonResponse

from Classes.FolderScraper import FolderScraper  # scrapes different JSON files and puts them together in objects.
from ALGator.taskclient import TaskClient
from Classes.GlobalConfig import GlobalConfig


@login_required
def home(request):

    scraper = FolderScraper()

    return render_to_response(
        'cpindex.html',
        {
            'contentpage'  : 'cplanding.html',
            'projects_list': scraper.projects_list,            
        }
        , context_instance=RequestContext(request)
    )

@login_required
def taskserver(request):

    serverStatus= TaskClient().talkToServer("status")
    tasks       = TaskClient().talkToServer("LIST")
    
    scraper = FolderScraper()
    return render_to_response(
        'cpindex.html',
        {
          'contentpage'  : 'taskserver.html',
          'projects_list': scraper.projects_list,
          
          'serverStatus': serverStatus,
          'tasks': tasks,
        },
        context_instance=RequestContext(request)
    )

@login_required
def project(request):

    project = request.GET.get('project', '')
    
    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Project %s" % (jweROOT, project), shell=True)
    
    scraper = FolderScraper()
    return render_to_response(
        'cpindex.html',
        {
          'contentpage'  : 'project.html',        
          'projects_list': scraper.projects_list,
          
          'project': project,
          'jweURL': jweURL,
        },
        context_instance=RequestContext(request)
    )


@login_required
def algorithm(request):

    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    #todo: kaj se zgodi, ce dobim projectName="" ali algorithmName="" 

    scraper = FolderScraper()
    for proj in scraper.projects_list:
        if proj.name == projectName:
          project = proj
    # todo: kaj se zgodi, ce po koncu te zanke project ni dolocen??

    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Algorithm %s PROJ-%s" % (jweROOT, algorithmName, projectName), shell=True)
    
    computers = GlobalConfig().getComputers()
    
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

    return render_to_response(
        'cpindex.html',
        {
          'contentpage'  : 'algorithm.html',        
          'projects_list': scraper.projects_list,

        
          'projectName':   projectName,
          'algorithmName': algorithmName,
          'project' : project,
          'jweURL': jweURL,
          'results': results,
          'computers': computers
        },
        context_instance=RequestContext(request)
    )


@login_required
def results(request):

    file = request.GET.get('file', '')
    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    computer = request.GET.get('comp', '')
    
    try:
      path = GlobalConfig().root_path + "data_root/projects/PROJ-" + projectName + "/results/" + computer + "/" + file
      cont = open(path, 'r').read()
    except:
      cont = "-- empty --"
    
    scraper = FolderScraper()

    return render_to_response(
        'cpindex.html',
        {
          'contentpage'  : 'showFileCont.html',        
          'projects_list': scraper.projects_list,

          'filename':   file + " (%s)" % computer,
          'fileCont': cont,
        },
        context_instance=RequestContext(request)
    )

@login_required
def history(request):

    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    testset = request.GET.get('testset', '')
    mtype = request.GET.get('mtype', '')

    try:
      file = "%s-%s-%s-%s.history" % (projectName, algorithmName, testset, mtype)            
      path = GlobalConfig().root_path + "data_root/log/tasks/" + file
      cont = open(path, 'r').read()
    except:
      cont = "-- empty --"
    
    scraper = FolderScraper()

    return render_to_response(
        'cpindex.html',
        {
          'contentpage'  : 'showFileCont.html',        
          'projects_list': scraper.projects_list,

          'filename':   file,
          'fileCont': cont,
        },
        context_instance=RequestContext(request)
    )



@login_required
def runtask(request):
    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    testsetName = request.GET.get('testset', '')
    mType = request.GET.get('mtype', '')

    try:
      taskID = TaskClient().talkToServer("addTask %s %s %s %s" % (projectName, algorithmName, testsetName, mType))    
      answer = TaskClient().talkToServer("taskStatus %s" % (taskID.replace("\n", "")))
    except:
      answer = "Unknown error"
    
    rsp={}
    rsp['answer']=answer
    return JsonResponse(rsp)
 
@login_required
def askServer(request):
    question = request.GET.get('q', '')
    
    return JsonResponse({"answer" : TaskClient().talkToServer(question).replace("\n", " ")})
 
 

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def concat(arg1, arg2):
    return str(arg1) + str(arg2)

