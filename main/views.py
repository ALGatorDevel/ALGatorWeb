from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.mail import send_mail


from ausers.autools import getUID, isAnonymousMode
from ausers.forms import LoginForm, ContactForm
from django.contrib.auth.decorators import login_required
from Classes.ServerConnector import connector
import json, random, string, os, time, re
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from Classes.GlobalConfig import globalConfig
from main.autils import rand_str

@ensure_csrf_cookie
def index(request):
    context = {
        'isDBMode': not isAnonymousMode(),
    }
    return render(request, 'home.html', context)


def pAskServer(request): 
    question     = request.POST.get('q', 'status')

    return JsonResponse({"answer" : connector.talkToServer(question, getUID(request))})


def append_middlefix(filename, suffix):
    basename, extension = os.path.splitext(filename)
    new_filename = f"{basename}_{suffix}{extension}"
    return new_filename    


# remove all files in upload folder older that 1 day 
def removeOldUploadedFiles(upload_path):
  cutoff_time = time.time() - (1 * 24 * 60 * 60)  # 1 day = 24 hours * 60 minutes * 60 seconds

  folder_contents = os.listdir(upload_path)

  for file_name in folder_contents:
    file_path = os.path.join(upload_path, file_name)
    if os.path.isfile(file_path):
        if os.path.getmtime(file_path) < cutoff_time:
            os.remove(file_path)


# upload image to temporary webupload folder (to be used during html edit)
@csrf_exempt
def uploadimage(request):
  try:
    if not (request.method == 'POST' and request.FILES.get('image')):
      return JsonResponse({'error': 'No image uploaded.'})    

    image           = request.FILES['image']
    upload_filename = append_middlefix(image.name, rand_str());
    relative_name   = os.path.join(globalConfig.STATIC_UPLOADFILES_REL, upload_filename).replace("\\", "/")

    # cleanup uploads that are older then 1 day
    removeOldUploadedFiles(globalConfig.STATIC_UPLOADFILES_ABS)

    with open(os.path.join(globalConfig.STATIC_UPLOADFILES_ABS, upload_filename), 'wb') as destination:
      for chunk in image.chunks():
        destination.write(chunk)

    # Return the URL of the uploaded image
    return JsonResponse({'Status':0, 'Answer': f'{relative_name}'})
  except Exception as e:
    return JsonResponse({'error': f'Error uploading image: {str(e)}'})    

# Function fixes html text (<img src="/static/webupload/medo_K85FtWXH.bmp"> --> <img src="%static{medo_K85FtWXH.bmp}">
# for all images in webupload) and returns fixed htmt text and array of all fixed images
def replace_staticfiles_and_extract(content):
    pattern = r"\"/"+ globalConfig.STATIC_UPLOADFILES_REL + "/([^<>\"]*)\""
    x_values = []
    
    def replace_and_extract_fn(match):
        x_value = match.group(1)  
        x_values.append(x_value)  
        return "\"%static{" + x_value + "}\""
    
    result = re.sub(pattern, replace_and_extract_fn, content)
    return result, x_values

# This function is called on html-edit-save. It replaces all temporary links to images in html text and
# copies images (using ALGatorServer request) from temporary folder to project's resources folder
@csrf_exempt
def moveimages(request):
  try:    
    if request.method == 'POST':
        html_text    = request.POST.get('htmltext', '')
        project_name = request.POST.get('projectName', '')

        if html_text and project_name:

            new_html, images = replace_staticfiles_and_extract(html_text)
            sid, status = connector.send_static_files_to_server(project_name, globalConfig.STATIC_UPLOADFILES_ABS, images, getUID(request))

            return JsonResponse({'Status':sid, 'Answer': status, 'newHtml': new_html})
        else:
            return JsonResponse({'Status':1, 'Answer': 'htmltext and/or projectName parameters are missing'}, status=400)
    else:
        return JsonResponse({'Status':2, 'Answer': 'Only POST requests are allowed'}, status=405)
  except Exception as e:
    return JsonResponse({'Status':3, 'Answer': f'Error moving image: {str(e)}'}, status=400)


def problems(request):
    projects_response = connector.talkToServer('getData {"Type":"Projects"}', getUID(request))
    projects_dict = json.loads(projects_response)
    projects_list = projects_dict.get("Answer", [])

    projects_description = []
    for project in projects_list:
      try:
        reqStr = 'getData {"Type":"ProjectDescription", "ProjectName":"' + project + '"}'
        project_response = connector.talkToServer(reqStr, getUID(request))
        project_desc = json.loads(project_response).get("Answer", "")
        projects_description.append({'Name':project, 'St': project_desc.get("St", ""), 'Ow': project_desc.get("Ow", ""), 'On': project_desc.get("On", ""), 'Tg': project_desc.get("Tg", []), 'Na': project_desc.get("Na", 0),'Nt': project_desc.get("Nt", 0),
                'Mo': project_desc.get("Mo", 0), 'De':project_desc.get("De", ""), 'Po':project_desc.get("Po", 0),'eid':project_desc.get("eid", "e?")})
      except:
        pass
    context = {
        'isDBMode':   not isAnonymousMode(),
        'projects_description': projects_description
    }

    return render(request, 'listOfProblems.html', context)



def about(request):
  return render(request, 'about.html', {'isDBMode': not isAnonymousMode()})
def howItWorks(request):
  return render(request, 'howItWorks.html', {'isDBMode': not isAnonymousMode()})
def faq(request):
  return render(request, 'faq.html', {'isDBMode': not isAnonymousMode()})
def download(request):
  return render(request, 'download.html', {'isDBMode': not isAnonymousMode()})
def screenshots(request):
  return render(request, 'screenshots.html', {'isDBMode': not isAnonymousMode()})
def contact(request):
    return render(request, "contact.html", {'isDBMode': not isAnonymousMode()})
