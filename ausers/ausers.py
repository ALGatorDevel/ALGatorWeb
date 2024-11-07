import json
from uu import Error

from django.http import QueryDict, HttpResponse
from django.core import serializers
from django.contrib.auth.hashers import make_password, check_password

from main.autils import rand_str
from .autools import au_response, is_valid_request_and_data, can, run_query, getPermissions, \
    getUserPermissionsForEntityAsNumber, getUserPermissionsForEntity, getGroupsPermissionsForEntity
from .models import User, Group_User, Group, Entities, Entity_permission, EntityPermissionGroup, EntityPermissionUser, \
    PermissionType, EntityType
from .auconsts import USER_ANONYMOUS, GROUP_ANONYMOUS, GROUP_EVERYONE, USER_ROOT, FULL_CONTROL
from .queries import PERMISSIONS_ENTTIES_USER_GROUP_ROOT, PERMISSIONS_ENTTIES_USER_GROUP


def try_get_user(response: HttpResponse) -> str:
    try:
        return response.user.uid
    except Exception:
        return USER_ANONYMOUS

def get_users(request: HttpResponse, *args) -> HttpResponse:
    if request is None :
        return au_response("Request is None.", 1)

    uid = try_get_user(request)
    user = User.objects.get(uid=uid)
    try:
        if user.is_superuser:
            data = User.objects.all()
        else:
            data = User.objects.filter(owner=uid) | User.objects.filter(uid=uid)

        users = serializers.serialize("json", data, fields=['uid', 'owner', 'username', 'first_name','last_name','email','affiliation','address','country','is_staff','is_superuser','is_active'])
        json_users = json.loads(users)

        users_out = {}
        for user in json_users:
            truid = user["fields"]["uid"]
            del user["fields"]["uid"]
            users_out[truid] = user["fields"]
        return au_response(users_out)
    except Exception:
        return au_response("ERROR: cannot get users.", 3)

def add_user(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['username', 'email', 'password']
    if not is_valid_request_and_data(request, data, fields):
      return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

    uid = try_get_user(request)
    try:
      username = data['username'].strip()
      User.objects.create_user(username, data['email'].strip(), data['password'].strip(), owner=uid, uid=rand_str(10))
      new_user = User.objects.get(username=username)
      return au_response(f"User '{username}' added @{new_user.uid}")
    except Exception as e:
        return au_response("Error: Cannot create user - " + str(e), 3)

def remove_user(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['uid']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)  # current user
        user = User.objects.get(uid=uid)
        ruid = data['uid']  # user to be deleted
        ruser = User.objects.get(uid=ruid)
        rusername = ruser.username

        if user.is_superuser or ruser.owner == uid:
            run_query("DELETE FROM ausers_user WHERE uid = %s", [ruid])
            return au_response(f"User '{rusername}' removed.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot remove user - " + str(e), 3)


def edit_user(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['uid']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid   = try_get_user(request)  # current user
        user  = User.objects.get(uid=uid)
        euid  = data['uid']            # uid of user to be edited
        euser = User.objects.get(uid=euid)

        if user.is_superuser or euser.uid == uid or euser.owner == uid:

            if "new_password" in data and data["new_password"]:
                if not (user.is_superuser and not euid==uid):
                  if not ("old_password" in data and data["old_password"]):
                    return au_response(f'To change password, provide both - old and new password.', 2)
                  old_password = data["old_password"]
                  if not check_password(old_password, euser.password):
                    return au_response(f'The old password does not match.', 3)
                euser.password = make_password(data["new_password"])

            if "first_name" in data and data["first_name"]:
                euser.first_name = data["first_name"]
            if "last_name" in data and data["last_name"]:
                euser.last_name = data["last_name"]
            if "email" in data and data["email"]:
                euser.email = data["email"]
            if "affiliation" in data and data["affiliation"]:
                euser.affiliation = data["affiliation"]
            if "address" in data and data["address"]:
                euser.address = data["address"]
            if "country" in data and data["country"]:
                euser.country = data["country"]

            # only superuser can change is_active, is_superuser and is_staff flags
            # to prevent loosing rights that can not be restored, root can not change its own super flags
            if user.is_superuser and not euser.uid == user.uid:
              if "is_active" in data and data["is_active"]:
                euser.is_active = (data["is_active"] == 'true')
              if "is_staff" in data and data["is_staff"]:
                euser.is_staff = (data["is_staff"]=='true')
              if "is_superuser" in data and data["is_superuser"]:
                euser.is_superuser = (data["is_superuser"]=='true')

            euser.save()
            return au_response(f"Profile data for user '{euser.username}' changed.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot edit user - " + str(e), 3)


def set_private(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['eid', 'private']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid  = try_get_user(request)  # current user
        user = User.objects.get(uid=uid)

        eid = data['eid']            # eid of entity to be modified
        private = data['private']    # new value of
        entity = Entities.objects.get(pk=eid)
        if user.is_superuser or uid == entity.owner.uid:
            entity.is_private = private
            entity.save()
            return au_response(f"Property 'private' of entity '{eid}' changed to '{private}'.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot set_private - " + str(e), 3)


def entities_permissions(request: HttpResponse, *args) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)

    try:
        uid = try_get_user(request)
        user = User.objects.get(uid=uid)
        if user.is_superuser:
          data = run_query(PERMISSIONS_ENTTIES_USER_GROUP_ROOT, [])
        else:
          data = run_query(PERMISSIONS_ENTTIES_USER_GROUP, [uid, uid, uid])

        return au_response(data)
    except Exception as e:
        return au_response("ERROR: cannot fetch entities_permission: " + str(e), 3)

# vrne pravice uporabnika za vse ne-privatne entitete sistema v obliki json tabele z vnosi {eid, permission}
def permissions(request: HttpResponse, *args) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)

    try:
        uid = try_get_user(request)
        data = getPermissions(uid)
        result = {item['eid']: item['permissions'] for item in data}
        return au_response(result)
    except Exception as e:
        return au_response("ERROR: cannot fetch permission: " + str(e), 3)

def add_permission(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['ugid', 'eid', 'value']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid  = try_get_user(request)  # current user

        ugid  = data['ugid']            # user/group id
        eid   = data['eid']             # entity id
        value = data['value']           # permission value to be set

        if can(uid, eid, "can_edit_rights"):
            # ... add permission to user/group table
            if ugid.startswith("u"):
                user = User.objects.get(uid=ugid)
                permission = EntityPermissionUser(entity_id=eid, user=user, value=value)
            else:
                group = Group.objects.get(id=ugid)
                permission = EntityPermissionGroup(entity_id=eid, group=group, value=value)
            permission.save()

            return au_response(f"Permission for '{eid}' added.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot add permission - " + str(e), 3)

def remove_permission(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['ugid', 'eid']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid  = try_get_user(request)  # current user

        ugid  = data['ugid']            # user/group id
        eid   = data['eid']             # entity id

        if can(uid, eid, "can_edit_rights"):
            # ... add permission to user/group table
            if ugid.startswith("u"):
                user = User.objects.get(uid=ugid)
                EntityPermissionUser.objects.filter(entity_id=eid, user=user,).delete()
            else:
                group = Group.objects.get(id=ugid)
                EntityPermissionGroup.objects.filter(entity_id=eid, group=group).delete()

            return au_response(f"Permission for '{eid}, {ugid}' removed.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response(f"Error: Cannot remove permission '{eid}, {ugid}' - " + str(e), 3)

def get_groups(request: HttpResponse, *args) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)
    try:
        uid = try_get_user(request)
        data = []
        user = User.objects.get(uid=uid)
        if user.is_superuser:  # root
          data = Group.objects.all()
        elif uid != USER_ANONYMOUS:
          joinedGroups = [gu.group for gu in Group_User.objects.filter(user=user)]
          ownedGroups  = list(Group.objects.filter(owner=user))
          data = ownedGroups #+ joinedGroups

        json_groups = json.loads(serializers.serialize("json", list(set(data)), ))

        groups_out = {}
        for group in json_groups:
            groups_out[group["pk"]] = group["fields"]
        return au_response(groups_out)
    except Exception as e:
        return au_response("ERROR: cannot fetch groups_user: " + str(e), 3)

def add_group(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['groupname', 'description']
    if not is_valid_request_and_data(request, data, fields):
      return au_response(f'Invalid request or missing one or more input fields {fields}', 1)

    uid  = try_get_user(request)
    user = User.objects.get(uid=uid)
    try:
      groupname = data['groupname'].strip()
      desc      = data['description'].strip()
      Group.objects.create(id=rand_str(8), name=groupname, description=desc, owner=user)
      new_group = Group.objects.get(name=groupname)
      return au_response(f"Group '{groupname}' added @{new_group.id}")
    except Exception as e:
        return au_response("Error: Cannot create group - " + str(e), 3)


def remove_group(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['id']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)  # current user
        user = User.objects.get(uid=uid)
        gid = data['id']  # group to be deleted
        group = Group.objects.get(id=gid)
        gname = group.name

        if user.is_superuser or group.owner.uid == uid:
            group.delete()
            return au_response(f"Group '{gname}' removed.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot remove group - " + str(e), 3)

def get_groupsuser(request: HttpResponse, *args) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)
    try:
        data = Group_User.objects.all()
        grps = {}
        for gu in data:
            if not grps.get(gu.group_id, None): grps[gu.group_id] = []
            grps.get(gu.group_id).append(gu.user_id)
        return au_response(grps)
        json_groups = json.loads(serializers.serialize("json", list(set(data)), ))

        groups_out = {}
        for group in json_groups:
            groups_out[group["pk"]] = group["fields"]
        return au_response(groups_out)
    except Exception as e:
        return au_response("ERROR: cannot fetch groupsuser_user: " + str(e), 3)


def add_groupusers(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['gid', 'users']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)  # current user
        user = User.objects.get(uid=uid)

        gid  = data['gid']            # user/group id
        group = Group.objects.get(id=gid)
        if user.is_superuser or group.owner.uid == uid:
          users = data['users']  # user/group id
          users_added = []
          error_users = []
          for nuser in users:
            try:
              userid = User.objects.get(username=nuser).uid
              if not Group_User.objects.filter(group_id=gid, user_id=userid).exists():
                Group_User(group_id=gid, user_id=userid).save()
                users_added.append(nuser)
              else: raise Exception("Pair exists.")
            except: error_users.append(nuser)
          return au_response(f"Users added: {str(users_added)}, skipped users: {error_users}.")
        else:
          return au_response("Error: access denied");
    except Exception as e:
        return au_response("ERROR: cannot add_groupusers: " + str(e), 3)


def remove_groupuser(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['gid', 'uid']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)  # current user
        user = User.objects.get(uid=uid)

        gid  = data['gid']  # group from which user is to be removed
        ruid = data['uid']  # user to be removed
        group = Group.objects.get(id=gid)
        ruser = User.objects.get(uid=ruid)

        if user.is_superuser or group.owner.uid == uid:
            Group_User.objects.get(group_id=gid, user_id=ruid).delete()
            return au_response(f"User '{ruser.username}' removed from group '{group.name}'.")
        else:
            return au_response("Error: access denied.", 2)
    except Exception as e:
        return au_response("Error: Cannot remove user from group - " + str(e), 3)


#returns all possible permissions that can be set to this entity
def get_all_user_permissions_by_eid(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['eid']
    if not is_valid_request_and_data(request, data, fields):
        return au_response(f'Invalid request or missing one or more input fields {fields}', 1)
    try:
        uid = try_get_user(request)
        eid = data['eid']
        try:
          et = Entities.objects.get(pk=eid).entity_type
          ep = Entity_permission.objects.filter(entity_type=et)
          data = [p.permission_type for p in ep]
        except Exception:
          data = []

        datas = serializers.serialize("json", list(set(data)), )
        return au_response(json.loads(datas))
    except Exception as e:
        return au_response("ERROR: cannot fetch all_user_permissions_by_eid: " + str(e), 3)

# returns a set of all permissions that can be set to entities of a given type
def get_all_permission_types_for_entities(request: HttpResponse) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)
    try:
      permission_map = dict(PermissionType.objects.values_list('id', 'codename'))

      data = {}
      for et in EntityType.objects.all():
        permissions = Entity_permission.objects.filter(entity_type_id=et.id).values_list('permission_type_id', flat=True)
        replaced_permissions = [permission_map.get(permission_id, 'Unknown') for permission_id in permissions]

        data[et.id] = list(replaced_permissions)

      return au_response(data)
    except Exception as ex:
      return au_response("ERROR: cannot fetch permission_types_entities: " + str(ex), 3)


def organize_hierarchy(data):
    structured_data = {key: value for key, value in data.items() if value["parent"] is None}
    for key, value in data.items():
        try:
          parent_key = value["parent"]
          if parent_key is not None:
            data[parent_key]["entities"][key] = value
        except:
            pass
    return structured_data

def getGroupsPermissionsForEntityBulk(entity, groups):
    # Fetch permissions for all groups in bulk
    group_permissions = EntityPermissionGroup.objects.filter(entity=entity, group__in=groups).select_related('group')
    return [
        {'type': 'g', 'name': epg.group.name, 'id': epg.group.id, 'permissions': epg.value}
        for epg in group_permissions
    ]


def getAllUserPermissionsForEntityBulk(entity, users):
    # Fetch user permissions for all specified users in bulk
    user_permissions = EntityPermissionUser.objects.filter(entity=entity, user__in=users).select_related('user')
    return [
        {'type': 'u', 'name': epu.user.username, 'id': epu.user.uid, 'permissions': epu.value}
        for epu in user_permissions
    ]

# determines tha "value" of permissions (for user and all groups it belongs to) for entity with entity_id (sum of
# permissions for entity and all its parents) and collects permissions (group and user) for entity and stores them in
# permission_values map (key=entity_id, value={'value':permissions, 'permissions':list_of_all_permissions});  at the
# beginning permission_values is empty map, at end (of all recursive calls) it contains permissions for each entity
def entites_permission_values(entities, entity_id, cuser, visible_users, epu_map, user_groups_ids, epg_map, visible_group_ids, permission_values):
    current_perm = permission_values.get(entity_id, {'value': -1, 'permissions': []})
    if current_perm['value'] >= 0:
        return current_perm

    entity = entities.get(id=entity_id)
    current_list = []
    permissions  = 0

    # user permission ...
    for u in visible_users:
      cper =  epu_map.get((entity_id, u.uid), 0)
      if cper:
        current_list += [{'type':'u', 'name':u.username, 'id':u.uid, 'permissions': cper}]
      if u.uid == cuser.uid:
        permissions |= cper
    # ... + all group permissions ...
    for (gi, gn) in visible_group_ids:
      g_permissions = epg_map.get((entity_id, gi),0)
      if gi in user_groups_ids:
        permissions  |= g_permissions
      if (g_permissions):
        current_list += [{'type':'g', 'name':gn, 'id':gi, 'permissions':g_permissions}]
    # ... + all permissions of parents
    if (entity.parent_id):
        calc_perm = entites_permission_values(
            entities, entity.parent_id, cuser, visible_users, epu_map, user_groups_ids, epg_map, visible_group_ids, permission_values)
        permissions  |= calc_perm['value']

    # override permissions for owned or private entities
    if cuser.uid == USER_ROOT or entity.owner_id == cuser.uid:
      permissions = FULL_CONTROL
    elif entity.is_private:
      permissions = 0

    permission_values[entity_id] = {'value': permissions, 'permissions': current_list}
    return permission_values[entity_id]

def get_entities(request: HttpResponse, *args) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)
    try:
        uid = try_get_user(request)
        user = User.objects.get(uid=uid)

        # users that are visible to current user
        if user.is_superuser:
          visible_users = User.objects.all()
        else:
          visible_users = User.objects.filter(owner=uid) | User.objects.filter(uid=uid)

        # ANONYMOUS or EVERYONE group
        default_group = Group.objects.filter(pk=(GROUP_ANONYMOUS if user.uid == USER_ANONYMOUS else GROUP_EVERYONE))
        # groups that user belongs to
        user_groups = default_group | Group.objects.filter(id__in=Group_User.objects.filter(user_id=user.uid).values_list('group_id', flat=True))
        # groups that are visible to current user
        if user.is_superuser:
            visible_groups = Group.objects.all()
        else:
            visible_groups = Group.objects.filter(owner_id=uid) | user_groups
        visible_group_ids = visible_groups.values_list('id', 'name')
        user_groups_ids   = user_groups.values_list('id', flat=True)

        # all group permissions
        epg_map = {
            (epg.entity_id, epg.group_id): epg.value
            for epg in EntityPermissionGroup.objects.all()
        }
        # all user permissions
        epu_map = {
            (epu.entity_id, epu.user_id): epu.value
            for epu in EntityPermissionUser.objects.all()
        }

        entities = Entities.objects.all()

        permission_values = {}
        for entity in entities:
          entites_permission_values(entities, entity.id, user, visible_users, epu_map, user_groups_ids, epg_map, visible_group_ids, permission_values)

        data=[]
        for entity in entities:
            perms = permission_values.get(entity.id, {'value':-1, 'permissions':[]})
            if perms['value'] > 0 or (not entity.is_private and entity.entity_type_id in {'et0_A', 'et0_P', 'et0_R', 'et0_T', 'et1'}):
                entity.perm_value = perms['value']
                entity.permissions = perms['permissions']
                data.append(entity)

        datas = serializers.serialize("json", data)
        json_entities = json.loads(datas)

        for i, entity in enumerate(data):
            json_entities[i]['fields']['permissions'] = entity.permissions
            json_entities[i]['fields']['perm_value']  = entity.perm_value

        entities_out = {}
        for entity in json_entities:
          treid = entity["pk"]
          entities_out[treid] = entity["fields"]
          entities_out[treid]["entities"] = {}
          entities_out[treid]["can_edit_rights"] = True #can_edit_rights(uid, entity["pk"])

        entities_out = organize_hierarchy(entities_out)

        return au_response(entities_out)
    except Exception as ex:
        return au_response("ERROR: cannot fetch entities: " + str(ex), 3)

def get_all_permission_types(request: HttpResponse) -> HttpResponse:
    if not is_valid_request_and_data(request):
        return au_response(f'Invalid request.', 1)
    try:
        data = PermissionType.objects.all()
        datas = serializers.serialize("json", list(set(data)), )
        etypes = json.loads(datas)
        etype_out = {}
        for etype in etypes:
          key = etype['fields']["codename"]
          del etype['fields']["codename"]
          etype_out[key] = etype['fields']

        return au_response(etype_out)
    except Exception as ex:
        return au_response("ERROR: cannot fetch all_permission_types: " + str(ex), 3)


def can_request(request: HttpResponse, data: dict) -> HttpResponse:
    fields = ['eid', 'codename']
    if not is_valid_request_and_data(request, fields):
        return au_response(f'Invalid request.', 1)

    try:
        if "uid" in data:
            uid = data["uid"]
        else:
            uid = try_get_user(request)
        eid = data["eid"]
        codename = data["codename"]

        can_do = can(uid, eid, codename)
        return au_response({'Can': can_do}, 0)
    except Exception as e:
        return au_response("Error in can: " + str(e), 1)