# PROBLEMS

from django.template.defaulttags import register
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.http import HttpResponse

from Classes.Entities import Entities 
from ALGator.taskclient import TaskClient

#@login_required
def problems(request):
    entities = Entities()
    projects_list = entities.get_projects_list(False)

    tc = TaskClient()

    return render_to_response(
        'index.html',
        {
            'projects_list': projects_list,
            'userperms' : tc.talkToServer("users userperm " + request.user.username),
        }
        , context_instance=RequestContext(request)
    )
    
#@login_required
def pdetails(request):
    
    projectName = request.GET.get('project', '')
    
    entities = Entities()
    project = entities.read_project(projectName, True)

    return render_to_response(
        'pdetails.html',
        {
            'project': project,
            'projects_list': entities.projects_list,

        }
        , context_instance=RequestContext(request)
    )

# technical details about the project
#@login_required
def tdetails(request):
    
    projectName = request.GET.get('project', '')
    
    entities = Entities()
    project = entities.read_project(projectName, True)
    if project == None:
      return HttpResponse('Unknown project: "' + projectName + '"')


    return render_to_response(
        'tdetails.html',
        {
            'project': project,
        }
        , context_instance=RequestContext(request)
    )


# results view (presenters) for project or for algorithm 
# this view might be called to show prsenters of the project (in this case only project is defined)
# or to show presenters of the algorithm (in this case both, the project and the algorithm are defined)
# the from_algorithm flag is sent to results.html to show the results properly
#@login_required
def results(request):
    
    projectName    = request.GET.get('project', '')
    algorithmName  = request.GET.get('algorithm', '')

    entities   = Entities()
    project   = entities.read_project(projectName, True)
    if project == None:
      return HttpResponse('Unknown project: "' + projectName + '"')

    if algorithmName == '':
      algorithm  = None
      presenters = project.ProjPresenters
    else:  
      algorithm = project.get_algorithm(algorithmName)    
      if algorithm == None:
        return HttpResponse('Unknown algorithm: "' + projectName + '/' + algorithmName + '"')
      presenters = algorithm.presenters + project.AlgPresenters 


    return render_to_response(
        'results.html',
        {
            'project'    : project,
            'algorithm'  : algorithm,
            'presenters' : presenters,
            'from_algorithm' : False if algorithm==None else True,
        }
        , context_instance=RequestContext(request)
    )

    
#@login_required
def adetails(request):
    
    projectName   = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    showType      = request.GET.get('showType', 'alg')
    
    entities = Entities()

    project   = entities.read_project(projectName, True)
    if project == None:
      return HttpResponse('Unknown project: "' + projectName + '"')

    algorithm = project.get_algorithm(algorithmName)    
    if algorithm == None:
      return HttpResponse('Unknown algorithm: "' + projectName + '/' + algorithmName + '"')

    if showType == 'alg':
        showPage = 'adetails.html'
    elif showType == 'imp':
        showPage = 'atdetails.html'
    else:
        return HttpResponse('Unknown showType: "' + showType + '"')

    return render_to_response(
        showPage,
        {
            'algorithm': algorithm,
            'project' : project,

        }
        , context_instance=RequestContext(request)
    )


#@login_required
def ppasica(request):    
    projectName = request.GET.get('projectName', '')  
    
    entities = Entities()
    project   = entities.read_project(projectName, True)
    if project == None:
        return HttpResponse('Unknown project: "' + projectName + '"')      

    return render_to_response(
        'ppasica.html',
        {
            'project': project,
    
        }
        , context_instance=RequestContext(request)
    )

def prepasica(request):    
    projectName = request.GET.get('projectName', '')  
    
    entities = Entities()
    project   = entities.read_project(projectName, True)
    if project == None:
        return HttpResponse('Unknown project: "' + projectName + '"')      

    return render_to_response(
        'prepasica.html',
        {
            'project': project,
    
        }
        , context_instance=RequestContext(request)
    )


# to show the content of the Algorithm-TestSet-*.txt files
#@login_required
def txtresults(request):
    
    projectName   = request.GET.get('project', '')
    algorithmName = request.GET.get('algorithm', '')
    
    entities = Entities()
    
    project   = entities.read_project(projectName, True)
    if project == None:
      return HttpResponse('Unknown project: "' + projectName + '"')

    algorithm = project.get_algorithm(algorithmName)    
    if algorithm == None:
      return HttpResponse('Unknown algorithm: "' + projectName + '/' + algorithmName + '"')

    if len(algorithm.txtResultFiles) > 0:
        cont = "Select one of the files to be shown."
    else:
        cont = "Results for this algorithm do not exit. Please run ALGator first!"

    return render_to_response(
        'txtresults.html',
        {
            'project': project,
            'algorithm' : algorithm,
            'firstTitle' : "/",
            'firstCont' : cont,
        }
        , context_instance=RequestContext(request)
    )



@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
