    function generatePermissionsHtml(node, level) {
        if (typeof node !== 'object' || node === null || Object.keys(node).length === 0) {
            return '';
        }

        let html = '<ul>';

        
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                let canEditRights = false; try {canEditRights = (((node[key].perm_value | ausers.entities['e0_S'].perm_value) & 128) == 128)} catch (e){}
                let isHidden = level > 1 ? ' hidden' : ''; // Only hide levels deeper than 2
                let hasChildren = node[key].entities && Object.keys(node[key].entities).length > 0;

                // Apply different class if the item has children or not
                let collapsibleClass = hasChildren ? 'has-children' : 'no-children';
                let collapsibleState = hasChildren && level <= 1 ? 'collapsed' : '';

                html += `<li>
                    <span class="collapsible ${collapsibleClass} ${collapsibleState}" onclick="toggleCollapse(this, '${key}')"></span><span onclick="toggleDiv('${key}')" class="ht">${key}: ${node[key].name} (type: ${node[key].entity_type}, owner: ${node[key].owner})</span>
                    <div id="rights_details_${key}" class="hidden-div hidden setrights">
                        <span class="usergroupspan">Private: <input id="privatecb_${key}" type="checkbox" class="usergroupcb" ${node[key].is_private ? "checked" : ""} onclick="privateCBChanged('${key}')"></span><br>
                        <hr style="margin:10px 0px 10px 0px;"><span class="usergroupspan">Custom permissions:</span><br>
                        <div id="rights_details_list_${key}" style="padding-left:15px;">`;  
                        
                var count = 0;

                node[key].permissions.forEach(function(perm) {
                  count++;
                  html += generatePermissionsHTMLLine("perm", key, node[key].entity_type, perm, count, canEditRights);
                });
                html += `</div><i id="addPermButton_${key}" class='fas fa-plus' style='font-size:16px; color:green; display:${canEditRights?"block":"none"}' 
                                  onclick="showHideAddPermDiv('${key}', '${node[key].entity_type}', 1)"></i>
                               <div id="addPermDiv_${key}" style="border:1px solid #d3d3d3; margin: 0px 50px 0px 15px; display:none">a</div>
                    </div>`;

                // Recursive call to generate child entities
                if (hasChildren) {
                    html += `<ul id="item_sublist_${key}" class="sub-entities ${isHidden}">` + generatePermissionsHtml(node[key].entities, level + 1) + '</ul>';
                }

                html += '</li>';
            }
        }

        html += '</ul>';
        return html;
    }

function showHideAddPermDiv(key, entity_type, mode) {
  var permButton = document.getElementById(`addPermButton_${key}`);
  var permDiv    = document.getElementById(`addPermDiv_${key}`);
  permButton.style.display = mode == 1 ? 'none' : 'block';
  permDiv   .style.display = mode == 0 ? 'none' : 'block';
  if (mode == 1) { // show
    var content = getNewPermissionHTLM(key, entity_type);
    permDiv.innerHTML = content;
    var selectUG = document.getElementById(`user_group_select_${key}`);
    populateUserGroupList(selectUG, "", true, true);  
  }
}

function getNewPermissionHTLM(key, entity_type) {
  var divC = generatePermissionsHTMLLine("new_perm", key, entity_type, {'type':'', 'name':'', permissions:65535, 'id':''}, -1);
      divC += `<div width=100% align=center>
                  <input id="addb_${key}" class="okcancelb" type=button value="Add"  onclick="addPermission('${key}', '${entity_type}', this.value)">
                  <input class="okcancelb" type=button value=Cancel onclick="showHideAddPermDiv('${key}','', 0)"></button>
               </div></div>`;
  return divC;
}

// count >= 0  ... izpis IZBRANIH CBjev za izbranega uporabnika/skupino; vsi CBji so izbrani
// count == -1 ... izpis VSEH CBjev, ki pripadajo entity_type, noben ni izbran
// count == -2 ... izpis vseh CBjev, ki pripadajo entiteti, izbrani so tisti, katerih value je v selValue
function getHTMLTableForPermissions(id, key, count, permission, entity_type, selValue) {
  var line ="<table><tr><td>"
  var i = 0;
  ausers.entities_permission_types[entity_type].forEach(function(perm_type) {
    var value = ausers.permission_types[perm_type].value;
    if ((permission.permissions & value) == value) {
      line += `<span class="usergroupspan">
                 <input name="${id}_${key}" type="checkbox" class="usergroupcb" onclick="${count >= 0 ? 'event.preventDefault();' : ''}" 
                   ${count==-1 ? "" : ((count>=0) || (count==-2 && ((selValue&value)==value)) ? "checked" : "")} value=${value}> ${perm_type}
               </span>`;
      if (++i==3) {
        i=0;
        line += '</td></tr><tr><td>';
      }
    }
  });
  for(;i<3;i++) line += '<span class="usergroupspan"></span>';
  line += "</td></tr></table>"
  return line;
}

var permLineColors = ["#f3f3f3", "#f1f8e9"];

function recolorPermlines(key) {
  const elements = document.querySelectorAll(`[name="permtab_${key}"]`);

  let i = 0;
  elements.forEach(element => {
    element.style.backgroundColor = permLineColors[i];
    i = 1-i;
  });    
}

// ena vrstica v rights_detail divu
// permission je json oblike {"type":"g","name":"everyone","id":"g2_ev26hedn7","permissions":257}
function generatePermissionsHTMLLine(id, key, entity_type, permission, count, canEditRights=false) {  
  var color = (count == -1) ? "white" : ((count % 2 == 0) ? permLineColors[0] : permLineColors[1]);

  var line = `<div id="permline_${key}_${permission.id}" class="table-wrapper"><table name="permtab_${key}" style="background-color:${color}; border: ${count==-1 ? 0 : 2}px solid ${color};"><tr><td style="vertical-align:top;">`;
      if (count!=-1)
        line+= `<span class="usergroupspan">${permission.type}: ${permission.name} </span>`;
      else {
        line +=`<span style="padding-left:5px;"class="usergroupspan">
                   User / group:
                </span><br>
                <span style="padding-left:8px;"><select id="user_group_select_${key}" 
                      onchange="setPermissionsCBs(this.value, '${id}', '${key}', '${entity_type}')">
                  </select></span>`;
      }
      line+=`</td><td id="perm_ptab_${id}_${key}">`;

      line += getHTMLTableForPermissions(id, key, count, permission, entity_type);

  let key_id=`"${key}", "${permission.id}"`;
  line += `</td><td style="width:31px"></td></tr></table>
    ${count!=-1 && canEditRights ? "<i class='fa fa-times small-image' style='font-size:16px;' onclick='removePermission("+key_id+")'></i>" : ""}</div>`;
  return line;
}


function addPermissionDB(key, entity_type, permission) {
  let entity = find_entity(ausers.entities, key);
  let allOK  = false;
  if (entity) {
      let data = {'ugid':permission.id, 'eid':key, 'value':permission.permissions};
      runNamedService("add_permission", data, result => {
        if (result.Answer.startsWith("Error:")) {
            showPopup(result.Answer)
        } else {
          entity.permissions.push(permission);
          addPermissionHTML(key, entity_type, permission);
          ausers.permissionsChanged = true;
        }
      });
  }
}
function addPermissionHTML(key, entity_type, permission) {
  let count = document.getElementsByName(`permtab_${key}`).length;

  document.getElementById(`rights_details_list_${key}`).innerHTML += 
    generatePermissionsHTMLLine("perm", key, entity_type, permission, count, true);

  showHideAddPermDiv(key, "", 0);    
  recolorPermlines(key);
}
function addPermission(key, entity_type, what) {
  // get and check selected user
  try {
    var ug = selectedUGId = document.getElementById(`user_group_select_${key}`).value;
    if (!ug) return;
    var ugtype = ug[0];
    var ugname = ugtype == 'g' ?  ausers.groups[ug].name : ausers.users[ug].username ;
  } catch (e) {return;} // if user/group is not defined -> return

  var checkboxes = document.querySelectorAll(`input[name="new_perm_${key}"]:checked`);
  var perms = 0;
  for (var checkbox of checkboxes) {
    perms |= checkbox.value;
  }
  if (!perms) return;

  // if "Update", first remove permission ...
  if (what == "Update") removePermission(key, ug);

  let permission = {"type":`${ugtype}`,"name":`${ugname}`,"id":`${ug}`,"permissions":perms};
  addPermissionDB(key, entity_type, permission);
}


function removePermissionDB(key, id) {
  let entity = find_entity(ausers.entities, key);
  if (entity) {
      runNamedService("remove_permission", {'ugid':id, 'eid':key}, result => {
        if (result.Answer.startsWith("Error:")) {
          showPopup(result.Answer);
        } else {
          entity.permissions = entity.permissions.filter(p => p.id != id);
          removePermissionHTML(key, id); 
          ausers.permissionsChanged = true;                
        }
      });
  }
}
function removePermissionHTML(key, id) {
  let permline = document.getElementById(`permline_${key}_${id}`);
  permline.remove();  
  recolorPermlines(key);
}
function removePermission(key, id) {
  // ce removePermissionDB uspe, bo klicala tudi removePermissionHTML
  removePermissionDB(key, id);
}



function hideAllPermissionsDivs() {
  document.querySelectorAll('div.setrights').forEach(function(div) {
    div.classList.add('hidden');
  });
}

// Function to show/hide the additional div below each item
function toggleDiv(key) {
    const div = document.getElementById(`rights_details_${key}`);
    if (div.classList.contains('hidden')) {
        hideAllPermissionsDivs();
        div.classList.remove('hidden');
    } else {
        div.classList.add('hidden');
    }
}

// Function to collapse/expand child entities
function toggleCollapse(element, key) {
    hideAllPermissionsDivs();
    const ul = document.getElementById(`item_sublist_${key}`);
    if (ul) {
        ul.classList.toggle('hidden'); 
        element.classList.toggle('collapsed'); 
    }
}

async function getEntities() {
   let data = ["get_entities", "get_permissions", "get_all_permission_types", "get_all_permission_types_for_entities"];
   await waitForUserDataToLoad(data, true);

   document.getElementById("permissions_content").innerHTML = generatePermissionsHtml(ausers.entities, 1);
}


function privateCBChanged(key) {
    let cb = document.getElementById(`privatecb_${key}`);
    runNamedService("set_private", {'eid':key, 'private': cb.checked ? "True" : "False"}, (result)=>{
        if (result.Answer.startsWith("Error:")) {
          showPopup(result.Answer);
          cb.checked = !cb.checked;
        }        
    });
}

