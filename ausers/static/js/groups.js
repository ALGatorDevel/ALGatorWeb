function getAddUserToGroupHTML() {
  let html = `
    <div class="gcontainer">
        Add
        <input type="text" id="userField" placeholder="User" click="openUGSelect('userSelect')">
        <div class="gcustom-select">
            <button class="ddbutton" onclick="openUGSelect('userSelect')"><i class="fa fa-angle-double-down"></i></button>
            <select class="gselect" id="userSelect" onchange="updateUGField('userSelect', 'userField')"></select>
        </div>
        to
        <input type="text" id="groupField" placeholder="Group">
        <div class="gcustom-select">
            <button class="ddbutton" onclick="openUGSelect('groupSelect')"><i class="fa fa-angle-double-down"></i></button>
            <select class="gselect" id="groupSelect" onchange="updateUGField('groupSelect', 'groupField')">
                <option value="" selected disabled>Choose group</option>
                <option value="Group 1">Group 1</option>
                <option value="Group 2">Group 2</option>
                <option value="Group 3">Group 3</option>
            </select>
        </div>
        <button>Add</button>
    </div>  `;
  return html;
}

function getAddUserHTML(gid) {
  let html = `
    <div style="text-align: center;">
      <select class="multiselect" id="addUserSelect" multiple style="width: 400px; top: 0px;"></select>  
        <button onclick="addUsersToGroup('${gid}');">Add user(s) to group</button>      
    </div>  `;
  return html;
}


function getNewGroupHTML() {
  var newGroupHTML = `
    <div style="font-size:20px; margin-bottom:5px;">New group </div>
    <div style=" display: flex; justify-content: center; border: 1px solid; border-radius:5px;">
    <table style="width:600px; padding: 15px;">
      <tr><td class="gentd"><label for="new_gname">Group name:</label></td>
          <td><input class="almostW pEdit"  type="text" id="new_gname" onkeyup="checkNewGroupDataOK();">
      </td></tr>
      <tr><td class="gentd"><label for="new_gdesc">Description:</label></td>
          <td><input class="almostW pEdit"  type="text" id="new_gdesc" onkeyup="checkNewGroupDataOK();">
      </td></tr>      
      <tr><td colspan=2 style="margin:10px; text-align:center;">
          <button id="newGroupActionB" disabled type="submit" onclick="createNewGroup()">Add</button>
          <button id="cancelNewGroupActionB" type="submit" onclick="cancelNewGroup()">Cancel</button>
      </td></tr>
    </table></div>
  `;
  return newGroupHTML;
}


function getManageGroupHTML(group) {
  let content = '';
  let ggroup = find_group_by_name(group);   // group object from ausers.group
  let showDeleteButton = ggroup && (group != 'everyone') && (group != 'anonymous');

  let deleteHTML = showDeleteButton ? 
    `<i class="fa fa-times small-image" style="position: absolute;top: 5px;right: 5px;" 
         title="Remove group" onclick="deleteGroup('${ggroup.id}')"></i>` : "";

  if (!group) {
    content = 'Select a group to manage.'
  } else if (group == 'everyone' || group == 'anonymous') {
    content = ggroup.description;
  } else {    
    if (ausers.groupsuser[ggroup.id]) {
      content = '<u>Group members: </u><br><div style="display:flex; flex-wrap: wrap;">';      
      ausers.groupsuser[ggroup.id].forEach(user => {
        let username = ausers.users[user].username;
        content += `
        <span class="guserbox">
          ${username}
          <i class="fas fa-times" style="color:brown; padding-left:15px;" title="Remove ${username}"
             onclick="removeUserFromGroup('${ggroup.id}', '${user}')"></i>
        </span>`; 
      });
      content +="</div>"
    } else 
      content += "<i>This group has no members.</i>"
    content += "<hr style='margin:20px;'>" + getAddUserHTML(ggroup.id);    
  }
  let html = `

    <div style=" position:relative; padding:15px; border: 1px solid; border-radius:5px;">    
      ${deleteHTML}
      ${content}
    </div>  `;
  return html;
}



async function loadGroupsPage(group_id) {
  let data = ["get_users", "get_groups", "get_groupsuser"];
  await waitForUserDataToLoad(data, true);
  
  const selectElement = document.getElementById('groups_list');
  await populateUserGroupList(selectElement, group_id, false, true, false);
  selectedGroupChanged();
}

function openUGSelect(selectId) {
   const select = document.getElementById(selectId);
   select.click(); // Programmatically opens the select dropdown
}

function updateUGField(selectId, fieldId) {
   const select = document.getElementById(selectId);
   const field = document.getElementById(fieldId);
   field.value = select.value;
}

async function selectedGroupChanged() {
  let selectElement = document.getElementById('groups_list'); 
  let selectedGroup = ""; // when no element selected, selectElement.options=null
  try {selectedGroup = selectElement.options[selectElement.selectedIndex].text;} catch(e) {}
  userHTML = getManageGroupHTML(selectedGroup);
  
  var formdiv = document.getElementById("editGropusInnerContent-form");
  formdiv.innerHTML = userHTML;

  $(`#addUserSelect`).select2({placeholder: "User(s)...", allowClear: true, tags:true});
  const selectElement2 = document.getElementById('addUserSelect');
  await populateUserGroupList(selectElement2, "", true, false, false);
}


function showAddGroupsFrame(show) {
  document.getElementById("edit_Groups_frame").style.display         = show ? "none"  : "block";
  document.getElementById("newGroupInnerContent-form").style.display = show ? "block" : "none"; 
}

function addNewGroup() {
  var newGroupHTML = getNewGroupHTML();

  document.getElementById("newGroupInnerContent-form").innerHTML = newGroupHTML;
  showAddGroupsFrame(true);
}

function cancelNewGroup() {
  showAddGroupsFrame(false);
}


function checkNewGroupDataOK() {
  var u1 = document.getElementById("new_gname");
  var u2 = document.getElementById("new_gdesc");
  document.getElementById("newGroupActionB").disabled = !(u1.value && u2.value);
}

function createNewGroup() {
  var u1 = document.getElementById("new_gname").value
  var u2 = document.getElementById("new_gdesc").value;   
  runNamedService("add_group", {"groupname":u1, "description":u2}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        ausers.loadData(["get_groups"]);
        let new_uid = "";try {new_uid=result.Answer.split("@")[1];} catch (e) {}
        loadGroupsPage(new_uid); 
        showAddGroupsFrame(false);
      }
    });
}


function deleteGroup(id) {
  let groupName = ausers.groups[id].name;
  if (groupName)
    showYesNoDialog(`Do you want to remove group '${groupName}'?`, deleteGroupPhase2, id);
}

function deleteGroupPhase2(answer, id) {   
  if (answer == 0)
    runNamedService("remove_group", {"id":id}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        ausers.loadData(["get_groups"]);
        loadGroupsPage(); 
      }
    });
}

async function addUsersToGroup(gid) {
  let selectElement = document.getElementById("addUserSelect");
  let selectedUsers = Array.from(selectElement.options)
                          .filter(option => option.selected)
                          .map(option => option.text);
  runNamedService("add_groupusers", {"gid":gid, "users":selectedUsers}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        waitForUserDataToLoad(["get_groupsuser"], true); 
        ausers.permissionsChanged = true;
        loadGroupsPage(gid); 
      }
    });
}

async function removeUserFromGroup(group, user) {
  runNamedService("remove_groupuser", {"gid":group, "uid":user}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        waitForUserDataToLoad(["get_groupsuser"], true);
        ausers.permissionsChanged = true;
        loadGroupsPage(group); 
      }
    });
}