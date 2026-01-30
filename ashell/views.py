from django.shortcuts import render
from Classes.GlobalConfig import globalConfig
from django.http import JsonResponse, HttpResponse
import os

def ashell(request):
    project = request.POST.get("project")
    return render(request,'ashell.html', {"project":project})

def getWebpageVersion(request):
    version = os.environ.get("ALGATORWEB_VERSION") or "?"
    session_id = request.session.session_key or "?"
    return JsonResponse({"answer" : version + "; session_key: " + session_id})