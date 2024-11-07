/* canPY ... return can() by calling python can() method from autools.py  (which conects directly to db)
   Parameters: entity (eid), action (codename) and (optional) user (uid)

  The result of this function is supposed to be the same as result 
  of can(), therefore canPY() is not used in program.

Example calls:
   canPY({'uid': 'u0', 'eid': 'e1', 'codename': 'can_write'}).then((data) => {...})
   canPY({'eid': 'e1', 'codename': 'can_write'}).then((data) => {...})
*/
// var can_dict = {};
function canPY(checkdata) {
    // Return if you have in cache.
    //if(can_dict.hasOwnProperty(`${checkdata.eid}${checkdata.codename}`)) {
    //    return new Promise((resolve, reject) => {resolve(can_dict[`${checkdata.eid}${checkdata.codename}`])});
    //}

    let dataToSend = {};
    if(!('eid' in checkdata) || !('codename' in checkdata)){
        throw new Error("can: 'eid' and 'codename' are missing!")
    }
    dataToSend.eid = checkdata.eid;
    dataToSend.codename = checkdata.codename;

    if('uid' in checkdata) {
        dataToSend.uid = checkdata.uid;
    }
    dataToSend.csrfmiddlewaretoken = window.CSRF_TOKEN;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/ausers/can',
            data: dataToSend,
            type: 'GET',
            success: function(data) {
                let result = false;
                try {
                  result = JSON.parse(data).Answer.Can;
                } catch (e) {}
                // can_dict[`${dataToSend.eid}${dataToSend.codename}`] = result;
                resolve(result);
            },
            error: function(err) {
                reject(false);
            }
      });
    });
}


function containsRight(id, p) {
    return (id & p) == p;
}

/*
  Javascript method can(eid, action) checks if current user can do action on eid. 
  It relays on data obtained by "get_permissions" (python view)

Example calls:
  can('e0_S', "can_read")

*/
async function can(eid, action) {
  // eid and action should not be empty or null
  if (!eid || !action) return false;

  if (ausers.permissionsChanged || !ausers.dataLoaded["get_permissions"]) 
    await waitForUserDataToLoad(["get_permissions"], ausers.permissionsChanged);

/*
  podatki so v ausers.permissions (npr: ausers.permissions['e0_S']=257) in v 
               ausers.permission_types (npr: ausers.permission_types["can_edit_users"].value=256)
*/
  if (ausers.permissions.hasOwnProperty(eid)) {
    if (ausers.permission_types.hasOwnProperty(action))  {
      let result = containsRight(ausers.permissions[eid], ausers.permission_types[action].value);
      return result;
   }
  } else  // if eid is not in permissions, eid is not in database, so user has full rights over it
    return true;
}


1;