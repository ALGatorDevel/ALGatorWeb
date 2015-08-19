import subprocess

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
    proj = request.GET.get('project', 'defProj')

    return render_to_response(
        'taskserver.html',
        {
          'serverStatus': serverStatus,
          'proj': proj
        },
        context_instance=RequestContext(request)
    )

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
