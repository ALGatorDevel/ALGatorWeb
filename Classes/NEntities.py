from Classes.Project import Project
from Classes.ServerConnector import connector
import json, base64

from ausers.autools import au_response
from problems.utils import replaceStaticLinks


def getValue(dictionary, key, default=''):
    return dictionary[key] if  isinstance(dictionary, dict) and key in dictionary.keys() else default

    # reads the project and returns an object of type Project. If deep = True all the information about the project
    # (including the information about its sub entities, like algorithms and test sets) are read entierly,
    # otherwise only basic information about the project is read


def read_project(project_name, uid="__internal__"):
  response = connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}' % project_name, uid)

  try:
    server_response = json.loads(response)
    if getValue(server_response, "Status", -1) == 0:
      project = getValue(server_response, "Answer", [])
      project["name"] = project_name
      return project
    else:
      return {'name':'', 'eid':'e?'}

  except Exception as exi:
    return Project("")

def read_testsets(uid="__internal__", project_name=""):
  resp = json.loads(connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}' % project_name, uid))
  testsets_names = getValue(getValue(resp, "Answer", {}), "TestSets", [])

  testsets = {}
  for testset_name in testsets_names:
    tsr = connector.talkToServer(f"getData {{'Type':'Testset', 'ProjectName':'{project_name}', 'TestsetName':'{testset_name}', 'Deep':true}}",uid)
    try:
      server_response = json.loads(tsr)
      tss = getValue(server_response, "Status", -1)
      if tss == 0:
        testset = getValue(server_response, "Answer", "")
        if testset != "":
          testsets[testset_name] = testset
    except: pass

  return testsets

def read_testset_files(uid="__internal__", project_name="", testset_name=""):
  resp = json.loads(connector.talkToServer(f'getData {{"Type":"TestsetFiles", "ProjectName":"{project_name}", "TestsetName":"{testset_name}"}}', uid))
  testset_files = []
  try:
    if getValue(resp, "Status", -1) == 0:
      testset_files = getValue(resp, "Answer", [])
  except: pass

  return testset_files

def read_testsets_common_files(uid="__internal__", project_name=""):
  resp = json.loads(connector.talkToServer(f'getData {{"Type":"TestsetsCommonFiles", "ProjectName":"{project_name}"}}', uid))
  testsets_common_files = []
  try:
    if getValue(resp, "Status", -1) == 0:
      testsets_common_files = getValue(resp, "Answer", [])
  except: pass

  return testsets_common_files


def read_testset_file(uid="__internal__", project_name="", testset_name="", file_name=""):
  resp = json.loads(connector.talkToServer(f'getData {{"Type":"TestsetFile", "ProjectName":"{project_name}", "TestsetName":"{testset_name}", "FileName":"{file_name}"}}', uid))
  file_content = "... error loading file"
  try:
    if getValue(resp, "Status", -1) == 0:
      file_content = getValue(resp, "Answer", "")
  except: pass

  return file_content

def remove_testset_file(uid="__internal__", project_name="", testset_name="", file_name=""):
  resp = json.loads(connector.talkToServer(f'alter {{"Action":"RemoveTestsetFile", "ProjectName":"{project_name}", "TestsetName":"{testset_name}", "FileName":"{file_name}"}}', uid))
  result = "... error removing file"
  try:
    if getValue(resp, "Status", -1) == 0:
      result = getValue(resp, "Answer", "")
  except: pass

  return result

# used to fetch the data of all entities (TestSets or Algorithms) from server
def read_entities(uid="__internal__", project_name="", entityID="TestSet"):
  resp = json.loads(connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}' % project_name, uid))
  entities_names = getValue(getValue(resp, "Answer", {}), entityID+"s", [])

  # change "TestSet" to "Testset"; for "Algorithms" this is unnecessary
  entityID = entityID.capitalize()

  entities = {}
  for entity_name in entities_names:
    etrs = connector.talkToServer(f"getData {{'Type':{entityID}, 'ProjectName':'{project_name}', {entityID+'Name'}:'{entity_name}', 'Deep':true}}",uid)
    try:
      server_response = json.loads(etrs)
      ett = getValue(server_response, "Status", -1)
      if ett == 0:
        entity = getValue(server_response, "Answer", "")
        if entity != "":
          if "HtmlFileContent" in entity:
            entity["HtmlFileContent"] = replaceStaticLinks(entity["HtmlFileContent"], project_name)
          entities[entity_name] = entity
    except: pass

  return entities
