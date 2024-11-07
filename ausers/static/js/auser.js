auservices = {
  'get_users'  : {
  	  'endpoint': '/ausers/get_users',   
      'method'  : 'GET',
      'params'  : [], 
      'comment' : 'No params required.'
  },
  'add_user'  : {
  	  'endpoint': '/ausers/add_user',   
      'method'  : 'POST',
      'params'  : ["username", "email", "password"],
      'comment' : ''      
  },

  'remove_user': {
  	  'endpoint': '/ausers/remove_user',   
      'method'  : 'POST',
      'params'  : ['uid'],
      'comment' : 'Provide uid of user to be removed.'      
  },

  'edit_user': {
      'endpoint': '/ausers/edit_user',
      'method'  : 'POST',
      'params'  : ['uid', 'new_password','old_password','first_name','last_name','email','affiliation','address','country','is_staff', 'is_superuser', 'is_active'],
      'comment' : 'Provide uid and fields to be changed. To change password, provide both - old and new password.'            
  },
  'get_permissions': {
      'endpoint': '/ausers/get_permissions',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },

  'add_permission': {
      'endpoint': '/ausers/add_permission',
      'method'  : 'POST',
      'params'  : ['ugid', 'eid', 'value'],
      'comment' : ''
  },
  'remove_permission': {
      'endpoint': '/ausers/remove_permission',
      'method'  : 'POST',
      'params'  : ['ugid', 'eid'],
      'comment' : ''
  },  

 'can': {
      'endpoint': '/ausers/can',
      'method'  : 'GET',
      'params'  : ["uid", "eid", "codename"],
      'comment' : ''
  },


  'set_private': {
      'endpoint': '/ausers/set_private',
      'method'  : 'POST',
      'params'  : ['eid', 'private'],
      'comment' : ''
  },

  'get_entities_permissions': {
      'endpoint': '/ausers/get_entities_permissions',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },

  'get_groups': {
      'endpoint': '/ausers/get_groups',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },
  'add_group'  : {
      'endpoint': '/ausers/add_group',   
      'method'  : 'POST',
      'params'  : ["groupname", "description"],
      'comment' : ''      
  },
  'remove_group': {
      'endpoint': '/ausers/remove_group',   
      'method'  : 'POST',
      'params'  : ['id'],
      'comment' : 'Provide id of group to be removed.'      
  },

  'get_groupsuser': {
      'endpoint': '/ausers/get_groupsuser',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },

  'add_groupusers': {
      'endpoint': '/ausers/add_groupusers',
      'method'  : 'POST',
      'params'  : ['gid', 'users'],
      'comment' : 'Add users (array of usernames) to group with id=gid.'
  },
  'remove_groupuser': {
      'endpoint': '/ausers/remove_groupuser',
      'method'  : 'POST',
      'params'  : ['gid', 'uid'],
      'comment' : 'Remove user from group'
  },

  'get_entities': {
      'endpoint': '/ausers/get_entities',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },
  'get_all_permission_types': {
      'endpoint': '/ausers/get_all_permission_types',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },

  'get_all_user_permissions_by_eid': {
      'endpoint': '/ausers/get_all_user_permissions_by_eid',
      'method'  : 'GET',
      'params'  : ["eid"],
      'comment' : ''
  },

  'get_all_permission_types_for_entities': {
      'endpoint': '/ausers/get_all_permission_types_for_entities',
      'method'  : 'GET',
      'params'  : [],
      'comment' : ''
  },

}



class AUsers {
  static initDataChunks = ["get_users", "get_groups", "get_all_permission_types", "get_permissions"];

  constructor() {
    this.dataLoaded                = {};
    this.dataLoadingInitiated      = {};

    this.users                     = {}   // all users that current user can control (including itself)
    this.groups                    = {}   // all groups that are owned by current user
    this.entities                  = {}   // all entities that current user can at least read   
    this.permissions               = {}   // all permissions for the current user (set of pairs (entity, permissions))

    this.permission_types          = {}   // permision types and their valuse (like "can_execute": {"name": "Can execute?","value": 4},)
    this.entities_permission_types = {}   // set of of permissions for each entity type
    this.groupsuser                = {}   // members of each group 
  }

  setVar(type, value) {
    switch (type) {
      case "get_users":                             this.users                     = value; break;
      case "get_groups":                            this.groups                    = value; break;
      case "get_entities":                          this.entities                  = value; break;
      case "get_permissions":                       this.permissions               = value; 
                                                    this.permissionsChanged        = false; break;
      case "get_all_permission_types":              this.permission_types          = value; break;
      case "get_all_permission_types_for_entities": this.entities_permission_types = value; break;  
      case "get_groupsuser":                        this.groupsuser                = value; break;          
    }
  }

  async loadData(typesToLoad) {
    typesToLoad.forEach((ttl) => {
      this.dataLoaded[ttl] = false;
      this.dataLoadingInitiated[ttl] = true;
    });

    let requests = [];
    typesToLoad.forEach((ttl) => {
      if (auservices.hasOwnProperty(ttl)) {
        requests.push(sendRequest(auservices[ttl].endpoint, null, auservices[ttl].method));
      }
    });                   
    Promise.all(requests).then((result) => {
      for(let idx = 0; idx<typesToLoad.length; idx++) {
        try {
          let jres =  JSON.parse(result[idx]);
          this.setVar(typesToLoad[idx],  (jres.Status==0) ? jres.Answer : {});
        } catch (e) {}
        this.dataLoaded[typesToLoad[idx]] = true;
      } 
    });  
  }
}

ausers = new AUsers();
ausers.loadData(AUsers.initDataChunks);

// permissionsChanged == true if permissions were not loaded yet or they have been 
// changed in database and not reloaded yet
ausers.permissionsChanged = false;

async function waitForUserDataToLoad(dataToLoad, reload = false, timeout = 5000) {
  // If reload is true, trigger the loading of all data in dataToLoad.
  // Otherwise, only load the data that hasn't been loaded yet.
  if (reload) 
    dataToLoadX = dataToLoad;
  else {
    dataToLoadX = [];
    for (let dt of dataToLoad)
      if (!ausers.dataLoadingInitiated[dt]) dataToLoadX.push(dt);
  }
  if (dataToLoadX.length > 0) ausers.loadData(dataToLoadX);
  
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const interval = setInterval(() => {
      let hasData = true;
      
      // Check if all required data is loaded
      dataToLoad.forEach(function(dt) {
        hasData = hasData && ausers.dataLoaded.hasOwnProperty(dt) && ausers.dataLoaded[dt];
      });

      if (hasData) {
        clearInterval(interval); // Stop checking
        resolve(); // Resolve the promise when data is loaded
      }

      // Check for timeout
      if (Date.now() - start >= timeout) {
        clearInterval(interval);
        reject(new Error('Data loading timed out')); // Reject the promise if timeout is reached
      }
    }, 100); // Polling interval
  });
}

function collectEntityKeys(obj, keys = new Set()) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.add(key);
      for (let kkey in obj[key]["entities"]) {
        collectEntityKeys(obj[key]["entities"], keys);
      }
    }
  }
  return keys;
}
async function getEntitiesKeysAsSet() {
  await waitForUserDataToLoad(["get_entities"]);
  return collectEntityKeys(ausers.entities); 
}

// find and return an entity with given key in ausers.entities or null if it does not exist
function find_entity(entities, key) {
  for (let ekey in entities) {
    if (ekey == key) return entities[ekey];
    let rek_find = find_entity(entities[ekey].entities, key);
    if (rek_find) return rek_find; 
  }
  return null;
}


function find_group_by_name(name) {
  for (let key in ausers.groups) {
    let ggroup = ausers.groups[key];
    if (ggroup.name == name) {
      ggroup.id = key;
      return ggroup;
    }
  }
  return null;
}

function setPermissionsCBs(who, id, eid, e_type) {
  var entities    = ausers.entities;
  var permissions =  getPermissionsForEntity(entities, eid);
  
  var permValueForWho = 0;
  if (permissions) {
    for (var i=0; i<permissions.length; i++) {
      if (permissions[i]["id"] == who) permValueForWho = permissions[i]["permissions"];
    };
  }

  var permTabElement = document.getElementById(`perm_ptab_${id}_${eid}`);
  permTabElement.innerHTML = getHTMLTableForPermissions(id, eid, -2, {"permissions":65535}, e_type, permValueForWho);
  document.getElementById(`addb_${eid}`).value = permValueForWho ? "Update" : "Add";
}

function getPermissionsForEntity(entities, eid) {
  var perm = "";
  for (k in entities) {
    perm = (k == eid) ? 
      entities[k].permissions :  getPermissionsForEntity(entities[k].entities, eid); 
    if (perm) break;
  }
  return perm;
}


// returns a html select element with auservices as options 
function getServiceListAsSelect() {
    // Create a select element
    const selectElement = document.createElement('select');
    selectElement.style.width="200px";
    selectElement.id    = "service_select_list"; 

    // Iterate over the keys of the JSON object and add each key as an option to the select element
    Object.keys(auservices).forEach(key => {
        const optionElement = document.createElement('option');
        optionElement.value = key;
        optionElement.textContent = key;
        selectElement.appendChild(optionElement);
    });

    // Return the select element
    return selectElement;
}

// runs a service and returns JSON
function runService(endpoint, method, dataToSend, callback) {
  sendRequest(endpoint, dataToSend, method).then((result) => {
      var res = {"Status":10};  // 10 = can not parse result
      try {
        var jres = JSON.parse(result);
        res = jres;
      } catch (e) {
        res["Answer"] = e.message + "; (result = " + result + ")";
      }
      if (!("Status" in res)) res["Status"] = 11;
      if (!("Answer" in res)) res["Answer"] = "Unknown answer.";
    callback(res);
  });
}

function runNamedService(name, dataToSend, callback) {
  var service = auservices[name];
  if (service)
    runService(service.endpoint, service.method, dataToSend, callback);
}


function sendRequest(endpoint, dataToSend, method){
    return new Promise(function(resolve, reject) {
        if (!dataToSend) dataToSend={};
        dataToSend.csrfmiddlewaretoken = window.CSRF_TOKEN;
        $.ajax({
            url: endpoint,
            data: dataToSend,
            type: method,
            success: (data) => {resolve(data)},
            error: (err) => {reject(err)}
        });
    });
}

