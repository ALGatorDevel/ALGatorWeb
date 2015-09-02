import subprocess
import os

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.template.defaulttags import register

from django.http import JsonResponse

from Classes.FolderScraper import FolderScraper  # scrapes different JSON files and puts them together in objects.

@login_required
def home(request):

    scraper = FolderScraper()

    return render_to_response(
        'cpindex.html',
        {
            'projects_list': scraper.projects_list,
        }
        , context_instance=RequestContext(request)
    )

@login_required
def taskserver(request):

    serverStatus = subprocess.check_output("java algator.TaskClient -a status", shell=True)
    
    tasks = subprocess.check_output("java algator.TaskClient -a LIST", shell=True)

    return render_to_response(
        'taskserver.html',
        {
          'serverStatus': serverStatus,
          'tasks': tasks
        },
        context_instance=RequestContext(request)
    )

@login_required
def project(request):

    project = request.GET.get('project', '')
    
    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Project %s" % (jweROOT, project), shell=True)

    return render_to_response(
        'project.html',
        {
          'project': project,
          'jweURL': jweURL 
        },
        context_instance=RequestContext(request)
    )


@login_required
def algorithm(request):

    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')

    scraper = FolderScraper()
    for proj in scraper.projects_list:
        if proj.name == projectName:
          project = proj

    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Algorithm %s PROJ-%s" % (jweROOT, algorithmName, projectName), shell=True)
    
    path = os.environ["ALGATOR_ROOT"] + "data_root/projects/PROJ-" + projectName + "/results/"
    mtypes = ["em", "cnt", "jvm"]
    results = {}
    for alg in project.algorithms:
        for ts in project.testsets:
            for mtype in mtypes:
               key = alg.name + "-" + ts.name + "." + mtype
               filename = path + key
               if os.path.isfile(filename):
                  with open(filename) as f:
                    for i, l in enumerate(f):
                      pass
                  desc = "%d tests" % i
               else:
                   desc = ""
               results[key] = desc

    return render_to_response(
        'algorithm.html',
        {
          'projectName':   projectName,
          'algorithmName': algorithmName,
          'project' : project,
          'jweURL': jweURL,
          'results': results
        },
        context_instance=RequestContext(request)
    )


@login_required
def results(request):

    file = request.GET.get('file', '')
    projectName = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    
    path = os.environ["ALGATOR_ROOT"] + "data_root/projects/PROJ-" + projectName + "/results/" + file
    cont = open(path, 'r').read()

    return render_to_response(
        'showFileCont.html',
        {
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

    answer = subprocess.check_output("java algator.TaskClient -a 'addTask %s %s %s %s'" % (projectName, algorithmName, testsetName, mType), shell=True)
    if answer.isdigit():
      answer = subprocess.check_output("java algator.TaskClient -a 'taskStatus %d'" % answer, shell=True)  
    
#    return render_to_response(
#        'serverAnswer.html',
#        {
#          'answer':   answer,
#        },
#        context_instance=RequestContext(request)
#    )

    rsp={}
    rsp['x']='y'
    #return JsonResponse({"%s-%s-%s-%s'" % (projectName, algorithmName, testsetName, mType): answer})
    return JsonResponse(rsp)
 

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def concat(arg1, arg2):
    return str(arg1) + str(arg2)
