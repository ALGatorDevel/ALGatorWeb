from django.template.defaulttags import register
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


from django.template.context import RequestContext
from django.http import HttpResponse

from Classes.Entities import Entities 
from ALGator.taskclient import TaskClient

# Create your views here.

def main(request):
    
    projectName = request.GET.get('project', '')
    if not projectName: 
      return render(request, "main.html", {}) 
    
    entities = Entities()
    project = entities.read_project(projectName, True)

    return render(request,
        'main.html',
        {
            'project': project,
            'projects_list': entities.projects_list,

        }
    )