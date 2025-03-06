import base64

from django.core import serializers
import json
from django.http import HttpResponse

from Classes.ServerConnector import connector
from Classes.NEntities import getValue, read_entities, read_project, read_testset_files, read_testset_file, \
    read_testsets_common_files
from ausers.ausers import try_get_user
from ausers.autools import is_valid_request_and_data, au_response
from problems.utils import replaceStaticLinks, updateResourcesIfNeeded, getPresentersData

def get_computer_familes(request: HttpResponse) -> HttpResponse:
    try:
      uid = try_get_user(request)

      server_response = json.loads(connector.talkToServer('getFamilies', uid))
      if server_response["Status"] == 0:
          families = getValue(server_response, "Answer", {})
          return au_response(families)
    except Exception as e:
        au_response("Can't read families: " + str(e), 1)


def get_project_general_data(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['ProjectName']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

    try:
      uid = try_get_user(request)
      problemName = data['ProjectName']

      server_response = json.loads(connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}' % problemName, uid))
      if server_response["Status"] == 0:
          project_data = getValue(server_response, "Answer", {})
          return au_response(project_data)
    except Exception as e:
        au_response("Can't read project general properties: " + str(e), 1)

def get_project_html_description(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['ProjectName']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)
        problemName = data['ProjectName']
        project_doc = {}

        try:
            server_response = json.loads(
                connector.talkToServer('getData {"Type":"ProjectDocs", "ProjectName":"%s"}' % problemName, uid))
            if server_response["Status"] == 0:
                project_docs                    = getValue(server_response, 'Answer', {})
                project_doc["html_desc"]            = replaceStaticLinks(base64.b64decode(getValue(project_docs, "Project", "")).decode("UTF-8"), problemName)
                project_doc["algorithms_html_desc"] = replaceStaticLinks(base64.b64decode(getValue(project_docs, "Algorithm", "")).decode("UTF-8"), problemName)
                project_doc["test_case_html_desc"]  = replaceStaticLinks(base64.b64decode(getValue(project_docs, "TestCase", "")).decode("UTF-8"), problemName)
                project_doc["test_sets_html_desc"]  = replaceStaticLinks(base64.b64decode(getValue(project_docs, "TestSet", "")).decode("UTF-8"), problemName)
                project_doc["project_ref_desc"]     = replaceStaticLinks(base64.b64decode(getValue(project_docs, "References", "")).decode("UTF-8"), problemName)
                project_doc["doc_resources"]        = getValue(project_docs, "Resources")

                updateResourcesIfNeeded(project_doc["doc_resources"], problemName, uid)
        except Exception:
          pass

        return au_response(project_doc)
    except Exception as e:
        return au_response("ERROR: cannot fetch get_project_html_description: " + str(e), 3)


def get_project_properties(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['ProjectName']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

    try:
      uid = try_get_user(request)
      problemName = data['ProjectName']

      project_props   = {}
      project_sources = {}

      server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectProps", "ProjectName":"%s"}' % problemName, uid))
      if server_response["Status"] == 0:
        project_props = getValue(server_response, "Answer", {})
      server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectSources", "ProjectName":"%s"}' % problemName, uid))
      if server_response["Status"] == 0:
        project_sources = getValue(server_response, "Answer", {})
        project_sources["Input"]  = base64.b64decode(getValue(project_sources,"Input"  , "")).decode("UTF-8")
        project_sources["Output"] = base64.b64decode(getValue(project_sources,"Output"  , "")).decode("UTF-8")
        project_sources["Tools"]  = base64.b64decode(getValue(project_sources,"Tools"  , "")).decode("UTF-8")
        for gen in project_sources["Generators"].keys():
            project_sources["Generators"][gen] = base64.b64decode(getValue(project_sources["Generators"], gen, "")).decode("UTF-8")
        for ind in project_sources["Indicators"].keys():
            project_sources["Indicators"][ind] = base64.b64decode(getValue(project_sources["Indicators"],ind  , "")).decode("UTF-8")

      return au_response({'Props' : project_props, 'Sources': project_sources})
    except Exception as e:
        au_response("Can't read project properties: " + str(e), 1)


def get_testsets(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']

  testsets = read_entities(uid, projectName, "TestSet")

  return au_response(testsets)

def get_testset_files(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName', 'TestsetName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']
  testsetName = data['TestsetName']

  testsets = read_testset_files(uid, projectName, testsetName)

  return au_response(testsets)

def get_testsets_common_files(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']

  testsets = read_testsets_common_files(uid, projectName)

  return au_response(testsets)


def get_testset_file(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName', 'TestsetName', 'FileName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']
  testsetName = data['TestsetName']
  fileName    = data['FileName']

  file_content = read_testset_file(uid, projectName, testsetName, fileName)

  return au_response(file_content)

def remove_testset_file(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName', 'TestsetName', 'FileName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']
  testsetName = data['TestsetName']
  fileName    = data['FileName']

  result = remove_testset_file(uid, projectName, testsetName, fileName)

  return au_response(result)


def get_algorithms(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']

  algorithms = read_entities(uid, projectName, "Algorithm")

  return au_response(algorithms)

def get_presenters(request: HttpResponse, data: dict) -> HttpResponse:
  fields = ['ProjectName']
  if not is_valid_request_and_data(request, data, fields):
    return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

  uid = try_get_user(request)
  projectName = data['ProjectName']

  project = read_project(projectName, uid)
  presenters = getPresentersData(project, projectName, uid)

  return au_response(presenters)

