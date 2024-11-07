import binascii
import json
import os
import re
import base64
from Classes.ServerConnector import connector

def getProjectData(problemName, uid="__internal__"):
    projectJSON = connector.talkToServer(f'getData {{"Type":"Project", "ProjectName":"{problemName}"}}', uid)
    return json.loads(projectJSON)

def getPresentersData(projectData, problemName, uid="__internal__"):
    presentersDataDICT = []
    presentersDataString = []
    if 'MainProjPresenters' in projectData:
      for presenter in projectData['MainProjPresenters']:
        presenterJSON = connector.talkToServer(f'getData {{"Type":"Presenter", "ProjectName":"{problemName}", "PresenterName":"{presenter}"}}', uid)
        presenterDICT = json.loads(presenterJSON)["Answer"]
        if 'Name' in presenterDICT:
          presenterDICT = traverse_and_transform(presenterDICT, lambda text: replaceStaticLinks(text, problemName))
          presentersDataDICT.append(presenterDICT)
          presentersDataString.append(json.dumps(presenterDICT))

    return [presentersDataDICT, presentersDataString]

def getPresenterData(problemName, presenter, uid="__internal__"):
    presenterJSON = connector.talkToServer(f'getData {{"Type":"Presenter", "ProjectName":"{problemName}", "PresenterName":"{presenter}"}}', uid)
    presenterDICT = json.loads(presenterJSON)
    return presenterDICT

def setPresenterData(problemName, presenterDICT, uid="__internal__"):
    presenterData = {
        "Name": presenterDICT['Name'],
        "Title": presenterDICT['Title'],
        "ShortTitle": presenterDICT['ShortTitle'],
        "Description": presenterDICT['Description'],
        "Query": presenterDICT['Query'], 
        "Layout": presenterDICT['Layout'],
    }

    # nastavi objekte ki so v Layoutu
    for row in presenterDICT['Layout']:
        for col in row:
            presenterData[col] = presenterDICT[col]


    requestString = f'alter {{"Action":"SavePresenter", "ProjectName":"{problemName}", "PresenterName": {json.dumps(presenterDICT["Name"])}, "PresenterData": {json.dumps(presenterDICT)}}}'
    presenterJSON = connector.talkToServer(requestString, uid)

def replaceStaticLinks(html_string, problemName):
    for sLink in re.findall(r'%static{([^}]+)}', html_string):
        newName = f"/static/ProjectDocs/{problemName}/{sLink}"
        html_string = html_string.replace(f"%static{{{sLink}}}", newName)
    return html_string


# recursively traverse dictionary and transform all text fields with transform_function
def traverse_and_transform(dictionary, transform_function):
  for key, value in dictionary.items():
    if isinstance(value, dict):
      dictionary[key] = traverse_and_transform(value, transform_function)
    elif isinstance(value, str):
      dictionary[key] = transform_function(value)
  return dictionary


def updateResourcesIfNeeded(projectDocResources, problemName, uid="__internal__"):
    for keyFileName, valueTimeStamp in projectDocResources.items():
        pathCheckForFile = os.path.join("static", "ProjectDocs", problemName, keyFileName.replace("\\", "/"))
        path = os.path.join("static", "ProjectDocs", problemName)
        # Resource ze obstaja preverimo ce ga je potrebno posodobiti
        if fileExists(pathCheckForFile):
            timeStamp = os.path.getmtime(pathCheckForFile)  
            if((valueTimeStamp / 1000) != timeStamp):
                ProjectResourceJson = connector.talkToServer(f'getData {{"Type":"ProjectResource", "ProjectName":"{problemName}", "ResourceName":"{keyFileName}"}}', uid)
                ProjectResourceDict = json.loads(ProjectResourceJson)
                saveBase64ToFile(ProjectResourceDict["Answer"], path, keyFileName)
                # nastavimo timestamp datoteke
                os.utime(pathCheckForFile, (valueTimeStamp / 1000, valueTimeStamp / 1000))
        else:
            ProjectResourceJson = connector.talkToServer(f'getData {{"Type":"ProjectResource", "ProjectName":"{problemName}", "ResourceName":"{keyFileName}"}}', uid)
            ProjectResourceDict = json.loads(ProjectResourceJson)
            saveBase64ToFile(ProjectResourceDict["Answer"], path, keyFileName)
            # nastavimo timestamp datoteke
            os.utime(pathCheckForFile, (valueTimeStamp / 1000, valueTimeStamp / 1000))
    


def saveBase64ToFile(dataBase64, path, fileName):
    try:
        data = base64.b64decode(dataBase64)
    except binascii.Error as e:
        print(f"Base64 decoding error: {e}")
        return

    if not os.path.exists(path):
        print(path)
        try:
            os.makedirs(path)
        except PermissionError as e:
            print(f"Permission denied: {e}")
            return

    file_path = os.path.join(path, fileName)
    

    try:
        with open(file_path, 'wb') as file:
            file.write(data)
            print(f"File saved at {file_path}")
    except IOError as e:
        print(f"IO Error: {e}")


def isBase64(inputString):
    try:
        base64.b64decode(inputString)
        return True
    except (TypeError, binascii.Error):
        return False
    
def fileExists(path):
    if os.path.exists(path):
        return True
    else:
        return False
    
def base64ToHtmlRecursive(input_dict):
    outputDict = {}
    
    for key, value in input_dict.items():
        if isinstance(value, str):
            try:
                outputDict[key] =  base64.b64decode(value).decode('windows-1252')
            except Exception as e:
                print(f"Error for key '{key}': {e}")
                outputDict[key] = None
        elif isinstance(value, dict):
            outputDict[key] = base64ToHtmlRecursive(value)
        else:
            # If the value is not a string or dictionary, keep it unchanged
            outputDict[key] = value
    
    return outputDict

def replace_string_in_array(arr, search_string, replacement_string):
    for i in range(len(arr)):
        for j in range(len(arr[i])):
            if arr[i][j] == search_string:
                arr[i][j] = replacement_string
    return arr
