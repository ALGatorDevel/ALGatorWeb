import subprocess
import os

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.template.defaulttags import register

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

    return render_to_response(
        'taskserver.html',
        {
          'serverStatus': serverStatus,
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

    project = request.GET.get('project', '')
    algorithm = request.GET.get('algorithm', '')

    jweROOT=os.environ["JWE_ROOT"];
    jweURL = subprocess.check_output("cd %s;./getAAA.pl ALGator Algorithm %s PROJ-%s" % (jweROOT, algorithm, project), shell=True)

    return render_to_response(
        'algorithm.html',
        {
          'project': project,
          'algorithm': algorithm,
          'jweURL': jweURL
        },
        context_instance=RequestContext(request)
    )

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
