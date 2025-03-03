// populates given select element with all users (text=username, value=uid)
async function populateUserGroupList(selectElement, uid_to_select, printUsers=false, printGroups=false, addPrefix=true, addEveryone=false) {
  await ausers.waitForDataToLoad(["get_users", "get_groups"]);

  var users = [];
  var firstSelectableGroup;
  var hasEveryone = false;
  if (printGroups) {
    for (const key in ausers.groups) {
      var groupName = ausers.groups[key].name;
      if (groupName == "everyone") hasEveryone = true;
      users.push([key, (addPrefix ? "g: " : "") + groupName]);
      if (!firstSelectableGroup && groupName!='everyone' && groupName!='anonymous' )
        firstSelectableGroup = key;
    }
    if (addEveryone && !hasEveryone) users.push(['g2_ev26hedn7', (addPrefix ? "g: " : "") + "everyone"]);
  }
  if (printUsers && printGroups && users.length != 0) users.push(["", "──────────"]);
  if (printUsers) for (const key in ausers.users) 
    users.push([key, (addPrefix ? "u: " : "") + ausers.users[key].username]);


  if (selectElement) {
    selectElement.innerHTML = "";
  
    users.forEach(function(user) {
      const option = document.createElement('option');    
      option.value = user[0];  
      option.innerHTML = user[1];  
      if (user[0] == "") option.disabled = true;
      selectElement.appendChild(option);  
    });

    // if no prefered selectable user/group was defined, select first group that is not 'everyone' or 'anonymous'
    if (printGroups && !uid_to_select) uid_to_select=firstSelectableGroup;  
    selectElement.value = uid_to_select;
  }
} 

function getEditProfileHTML(uid, username, email, first_name, last_name, affiliation, address, country, is_active, is_staff, is_superuser, countries) {
  var profileHTML = `<div style="position:relative;  justify-content: center; border: 1px solid; border-radius:5px;">
      <i class="fa fa-times small-image" style="position: absolute;top: 5px;right: 5px;  display:${uid==current_user_uid ? 'none' : 'block'}" 
         title="Remove user" onclick="askRemoveUser()"></i>

    <table style="width:600px; padding: 15px;">
      <tr><td class="gentd"><label for="username">Username:</label></td>
          <td><input class="almostW pEdit"  type="text" id="username" readonly value="${username}">
      </td></tr>
      <tr><td class="gentd"><label for="email">Email:</label></td>
          <td><input class="almostW pEdit"  type="text" id="email"    onkeyup="enableUserSave(true)" value="${email}">
      </td></tr>
      <tr><td class="gentd"><label for="first_name">First name:</label></td>
          <td><input class="almostW pEdit"  type="text" id="first_name" onkeyup="enableUserSave(true)"  value="${first_name}">
      </td></tr>
      <tr><td class="gentd"><label for="last_name">Last name:</label></td>
          <td><input class="almostW pEdit"  type="text" id="last_name" onkeyup="enableUserSave(true)"  value="${last_name}">
      </td></tr>
      <tr><td class="gentd"><label for="affiliation">Affiliation:</label></td>
          <td><input class="almostW pEdit"  type="text" id="affiliation" onkeyup="enableUserSave(true)"  value="${affiliation}">
      </td></tr>
      <tr><td class="gentd"><label for="address">Address:</label></td>
          <td><input class="almostW pEdit"  type="text" id="address" onkeyup="enableUserSave(true)"  value="${address}">
      </td></tr>
      <tr><td class="gentd"><label for="country">Country:</label></td>
          <td><input type="text" list="countries" class="almostW pEdit"  id="country"  onkeyup="enableUserSave(true)"  value="${country}">
          <datalist id="countries">${countries}</datalist>
      </td></tr>
    `;
  var superHTML = `
      <tr><td class="gentd"><label for="is_active">Is active:</label></td>
          <td><input class="almostW pEdit"  type="checkbox" style="width:18px" id="is_active" onchange="enableUserSave(true)"  ${is_active ? "checked" : ""}>
      </td></tr>
      <tr><td class="gentd"><label for="is_staff">Is staff:</label></td>
          <td><input class="almostW pEdit"  type="checkbox" style="width:18px" id="is_staff" onchange="enableUserSave(true)"  ${is_staff ? "checked" : ""}>
      </td></tr>
      <tr><td class="gentd"><label for="is_superuser">Is superuser:</label></td>
          <td><input class="almostW pEdit"  type="checkbox" style="width:18px" id="is_superuser" onchange="enableUserSave(true)"  ${is_superuser ? "checked" : ""}>
      </td></tr>
    `;
  var endHTML = `
      <tr><td colspan=2 style="margin:10px; text-align:center;">
        <button id="userSaveB"   disabled type="submit" onclick="saveUserProfile()">Save Changes</button>
        <!--button id="userRemoveB" ${uid==current_user_uid ? "disabled" : ""} type="submit" onclick="askRemoveUser()">Delete user</button-->
      </td></tr>
    </table></div>    
  `;
  return profileHTML + (current_user_is_superuser && (uid != current_user_uid) ? superHTML : "") + endHTML; 
}

function enableUserSave(enable) {
  document.getElementById("userSaveB").disabled=!enable;
}

function saveUserProfile() {
  var uid = document.getElementById('user_list').value;
  var newProfile = {
    'uid': uid,
    'first_name':   document.getElementById('first_name').value,
    'last_name':    document.getElementById('last_name').value,
    'email':        document.getElementById('email').value,
    'affiliation':  document.getElementById('affiliation').value,
    'address':      document.getElementById('address').value,
    'country':      document.getElementById('country').value,
  }
  if (document.getElementById('is_staff'))
    newProfile['is_staff']=document.getElementById('is_staff').checked;
  if (document.getElementById('is_staff'))
    newProfile['is_superuser']=document.getElementById('is_superuser').checked;
  if (document.getElementById('is_staff'))
    newProfile['is_active']=document.getElementById('is_active').checked;
  
  runNamedService(ausers.services, "edit_user", newProfile, (result) => {
    showPopup(result.Answer);
    if (result.Status==0)
      enableUserSave(false);
    ausers.loadData(["get_users"]);
  });
}


function selectedUserChanged() {
  addUserForm(document.getElementById('user_list').value);
}

async function addUserForm(uid) {
  if (!countryDataListValue) await loadCountries();
  var curUser = ausers.users[uid];
  
  var userHTML = "Unknown user";
  if (curUser)
    userHTML = getEditProfileHTML(uid, curUser["username"], curUser["email"], curUser["first_name"], curUser["last_name"], curUser["affiliation"], curUser["address"], curUser["country"], curUser["is_active"], curUser["is_staff"], curUser["is_superuser"], countryDataListValue);
  
  var formdiv = document.getElementById("editUserInnerContent-form");
  formdiv.innerHTML = userHTML;
}

async function loadProfilePage(user_uid=current_user_uid) {
  let selectElement     = document.getElementById('user_list');
  let singleUserElement = document.getElementById('single_user_label');

  await populateUserGroupList(selectElement, user_uid, true, false, false);
  
  if (selectElement.options.length == 1) singleUserElement.innerHTML = selectElement.textContent;

  selectElement.style.display     =  (selectElement.options.length == 1) ? "none"  : "";
  singleUserElement.style.display =  (selectElement.options.length == 1) ? "" : "none";

  selectedUserChanged();
}

function askRemoveUser() {
  var uid = document.getElementById('user_list').value;
  if (uid == current_user_uid) {
    alert("You cannot remove yourself.");
    return;
  }
  var user = ausers.users[uid];
  showYesNoDialog("Do you want to remove user  '" + user["username"] + "'?", removeUser, uid);
}
function removeUser(answer, uid) {
  if (answer == 0) {
    runNamedService(ausers.services, "remove_user", {"uid":uid}, (result) => {
      showPopup(result.Answer);
      if (result.Status==0)
        ausers.loadData(["get_users"]);
      loadProfilePage();
    });
  }   
}




function getNewUserHTML() {
  var newuserHTML = `
    <div style="font-size:20px; margin-bottom:5px;">New user </div>
    <div style=" display: flex; justify-content: center; border: 1px solid; border-radius:5px;">
    <table style="width:600px; padding: 15px;">
      <tr><td class="gentd"><label for="new_uname">Username:</label></td>
          <td><input class="almostW pEdit"  type="text" id="new_uname" onkeyup="checkNewUserDataOK();" autocomplete="new-password">
      </td></tr>
      <tr><td class="gentd"><label for="new_email">Email:</label></td>
          <td><input class="almostW pEdit"  type="text" id="new_email" onkeyup="checkNewUserDataOK();" autocomplete="new-password">
      </td></tr>      
      <tr><td class="gentd"><label for="new_pswd">Password:</label></td>
          <td><input class="almostW pEdit"  type="password" id="new_pswd" onkeyup="checkNewUserDataOK();" autocomplete="new-password">
      </td></tr>
      <tr><td class="gentd"><label for="new_pswd2">Confirm password:</label></td>
          <td><input class="almostW pEdit"  type="password" id="new_pswd2" onkeyup="checkNewUserDataOK();" autocomplete="new-password">
      </td></tr>
      <tr><td colspan=2 style="margin:10px; text-align:center;">
          <button id="newUserActionB" disabled type="submit" onclick="createNewUser()">Add</button>
          <button id="cancelNewUserActionB" type="submit" onclick="cancelNewUser()">Cancel</button>
      </td></tr>
    </table></div>
  `;
  return newuserHTML;
}

// show "new user" and hide "user profile" frame
function showAddUserFrame(show) {
  document.getElementById("edit_profile_frame").style.display        = show ? "none"  : "block";
  document.getElementById("newUserInnerContent-form").style.display  = show ? "block" : "none"; 
}


function addNewUser() {
  var newUserHTML = getNewUserHTML();

  document.getElementById("newUserInnerContent-form").innerHTML = newUserHTML;
  showAddUserFrame(true);
}

function cancelNewUser() {
  showAddUserFrame(false);
}



function checkNewUserDataOK() {
  var u1 = document.getElementById("new_uname");
  var e1 = document.getElementById("new_email");
  var p1 = document.getElementById("new_pswd");
  var p2 = document.getElementById("new_pswd2");
  document.getElementById("newUserActionB").disabled = !((p1.value == p2.value) && u1.value && e1.value && p1.value && p2.value);
}

function createNewUser() {
  var u1 = document.getElementById("new_uname");
  var p1 = document.getElementById("new_pswd");
  var e1 = document.getElementById("new_email");
  runNamedService(ausers.services, "add_user", {"username":u1.value, "email":e1.value, "password":p1.value}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        ausers.loadData(["get_users"]);
        let new_uid = "";try {new_uid=result.Answer.split("@")[1];} catch (e) {}
        loadProfilePage(new_uid); 
        showAddUserFrame(false);
      }
    });
}

function getChangePasswordHTML(uid, username, requireOldPassword) {
  var changePasswordHTML = `<div style=" display: flex; justify-content: center; border: 1px solid; border-radius:5px;">
    <table style="width:600px; padding: 15px;">
      <tr><td class="gentd"><label for="cp_username">Username:</label></td>
          <td><input class="almostW pEdit"  type="text" id="cp_username" disabled value="${username}">
      </td></tr>    
      <${!requireOldPassword ? "!--":""}tr><td class="gentd"><label for="old_pswd">Old password:</label></td>
          <td><input class="almostW pEdit"  type="password" id="old_pswd" onkeyup="checkChangePasswordDataOK();" autocomplete="new-password">
      </td></tr${!requireOldPassword ? "--":""}>
      <tr><td class="gentd"><label for="new_pswd">New password:</label></td>
          <td><input class="almostW pEdit"  type="password" id="new_pswd" onkeyup="checkChangePasswordDataOK();" autocomplete="new-password">
      </td></tr>
      <tr><td class="gentd"><label for="new_pswd2">Confirm new password:</label></td>
          <td><input class="almostW pEdit"  type="password" id="new_pswd2" onkeyup="checkChangePasswordDataOK();" autocomplete="new-password">
      </td></tr>
      <tr><td colspan=2 style="margin:10px; text-align:center;">
        <button id="changePasswordB"       disabled type="submit" onclick="changePassword()">Change password</button>
        <button id="cancelChangePasswordB"          type="submit" onclick="cancelChangePassword()">Cancel</button>
      </td></tr>
    </table></div>    
  `;
  return changePasswordHTML;
}
function cancelChangePassword() {
  loadChangePasswordPage();
}
function checkChangePasswordDataOK() {
  var p1 = document.getElementById("new_pswd");
  var p2 = document.getElementById("new_pswd2");
  document.getElementById("changePasswordB").disabled = !((p1.value == p2.value) && p1.value && p2.value);
}
function changePassword() {
  var op1 = document.getElementById("old_pswd");
  var np1 = document.getElementById("new_pswd");
  var uid = document.getElementById('cp_user_list').value;  
  runNamedService(ausers.services, "edit_user", {'uid': uid, "old_password":op1 ? op1.value : "", "new_password":np1.value}, (result) => {  
      showPopup(result.Answer);
      if (result.Status==0) {
        ausers.loadData(["get_users"]);
        loadProfilePage();
        document.getElementById("newUserB").style.display="block"; 
        document.getElementById("newUserInnerContent-form").style.display="none"; 
      }
    });
}

async function loadChangePasswordPage() {
  let selectElement     = document.getElementById('cp_user_list');
  let singleUserElement = document.getElementById('cp_single_user_label');

  await populateUserGroupList(selectElement, current_user_uid, true, false, false);

  if (selectElement.options.length == 1) singleUserElement.innerHTML = selectElement.textContent;

  selectElement.style.display     =  (selectElement.options.length == 1) ? "none"  : "";
  singleUserElement.style.display =  (selectElement.options.length == 1) ? "" : "none";

  selectedChangePasswordUserChanged();
}


function selectedChangePasswordUserChanged() {
  addChangePasswordForm(document.getElementById('cp_user_list').value);
}
async function addChangePasswordForm(uid) {
  var curUser = ausers.users[uid];
  
  var userHTML = "Unknown user";
  if (curUser)
    userHTML = getChangePasswordHTML(uid, curUser["username"], !(current_user_is_superuser && current_user_uid!=uid));
  
  var formdiv = document.getElementById("changePasswordInnerContent-form");
  formdiv.innerHTML = userHTML;
}