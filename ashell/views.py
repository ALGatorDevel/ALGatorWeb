from django.shortcuts import render
from Classes.GlobalConfig import globalConfig
from django.http import JsonResponse
import os

def ashell(request):
  return render(request,
    'ashell.html',
    {
      'algator_root' : globalConfig.root_path,   
    }
  )

def getWebpageVersion(request):
    version = os.environ.get("ALGATORWEB_VERSION")
    session_id = request.session.session_key or "?"
    return JsonResponse({"answer" : version + "; session_key: " + session_id})