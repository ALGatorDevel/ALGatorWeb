class AUsers extends PageData {

services = {
  'who'  : {
      'endpoint': '/ausers/who',   
      'method'  : 'GET',
      'params'  : [], 
      'comment' : 'No params required.'
  },

  'info'  : {
      'endpoint': '/ausers/info',   
      'method'  : 'GET',
      'params'  : [], 
      'comment' : 'Django settings info. No params required.'
  },

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

  'sendmail': {
      'endpoint': '/ausers/sendmail',
      'method'  : 'POST',
      'params'  : ["Name", "Email", "Message"],
      'comment' : ''
  },
}


  constructor() {
    super();

    this.users                     = {}   // all users that current user can control (including itself)
    this.groups                    = {}   // all groups that are owned by current user
    this.entities                  = {}   // all entities that current user can at least read   
    this.permissions               = {}   // all permissions for the current user (set of pairs (entity, permissions))

    this.permission_types          = {}   // permision types and their valuse (like "can_execute": {"name": "Can execute?","value": 4},)
    this.entities_permission_types = {}   // set of of permissions for each entity type
    this.groupsuser                = {}   // members of each group 
  }

  setVar(type, value, params) {
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
}

ausers = new AUsers();

// permissionsChanged == true if permissions were not loaded yet or they have been 
// changed in database and not reloaded yet
ausers.permissionsChanged = false;

  
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
  await ausers.waitForDataToLoad(["get_entities"]);
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

const type_sufix_map = new Map([["et2", "A"], ["et3", "T"], ["et4", "R"]]);
function add_entity(ent_type, eid, name, isPrivate) {
  let parentEID = projectEID + "_" + type_sufix_map.get(ent_type);
  let parentE = find_entity(ausers.entities, parentEID);
  if (parentE) {
    parentE.entities[eid]={'eid':eid, 'name': name, 'entity_type': ent_type, 'parent':parent, 'is_private': isPrivate, entities:[], 'owner':current_user_uid};
  }
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
