from django.shortcuts import render
from Classes.GlobalConfig import globalConfig
from django.http import JsonResponse, HttpResponse
import os

from ausers.ausers import try_get_user
from ausers.autools import can


def ashell(request):
  # uid = try_get_user(request)
  # ashell is only available for "super-users" (and everyone with full_control over the system)
  #if can(uid, "e0_S", "full_control"):
    return render(request,'ashell.html', {})
  #else:
  #    return HttpResponse("AShell - access denied.", content_type="text/html")

def getWebpageVersion(request):
    version = os.environ.get("ALGATORWEB_VERSION") or "?"
    session_id = request.session.session_key or "?"
    return JsonResponse({"answer" : version + "; session_key: " + session_id})