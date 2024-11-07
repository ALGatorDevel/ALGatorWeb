from django.db import connection
from django.http import HttpResponse
import re, json

from Classes.ServerConnector import connector
from .models import User, Group, Group_User, EntityPermissionUser, PermissionType, Entities, EntityPermissionGroup
from .auconsts import USER_ANONYMOUS, GROUP_EVERYONE, GROUP_ANONYMOUS, FULL_CONTROL

isAnonymous = None
def isAnonymousMode():
  global isAnonymous
  if isAnonymous is None:
      isAnonymous = True if (connector.talkToServer("DBDATA") == "false") else False
  return isAnonymous


def getUID(request):
    try:
        return request.user.uid
    except:
        return USER_ANONYMOUS

def entity_is_private(entity):
    try:
      return entity.is_private or (entity.parent and entity_is_private(Entities.objects.get(pk=entity.parent)))
    except:
        return entity.is_private

def containsRight(id, p):
    return (id & p) == p

def can(uid: str, eid: str, codename: str) -> bool:
    if (is_null_or_empty(uid) or is_null_or_empty(eid) or is_null_or_empty(codename)):
        return False

    try:
        user = User.objects.get(uid=uid)
        e    = Entities.objects.get(pk=eid)
        p    = PermissionType.objects.get(codename=codename)

        if not (user and p):
            return False
        if not e: # ce entiteta v bazi ne obstaja, ima uporabnik nad njo vse pravice
            return True

        perms = getUserPermissionsForEntityAsNumber(e, user)
        return containsRight(perms, p.value)
    except:
        return False

def au_response(content, error_status=0) -> HttpResponse:
    response = HttpResponse()
    response.content_type = "application/json"
    response.status_code  = 200

    response_data = {}
    response_data['Status'] = error_status
    response_data['Answer'] = content
    response.content        = json.dumps(response_data)
    return response

    
# returns all permissions (integer) that user has over a given entity
#   - method calculates effective permissions (using explicit and implicit rules)
#   - groups=set of groups that user belongs to; if groups=None, method will construct this set

def getUserPermissionsForEntityAsNumber(entity, user, groups=None):
    # grant full-control to superusers and owner and if ANONYMOUS mode is on
    if user.is_superuser or entity.owner == user or isAnonymousMode():
        return FULL_CONTROL

    if groups is None:
        groups = {gu.group for gu in Group_User.objects.filter(user=user)}  # set of user's groups
        groups.add(Group.objects.get(pk=(GROUP_ANONYMOUS if user.uid == USER_ANONYMOUS else GROUP_EVERYONE)))



    # skip private entities (for everyone but superusers and owners)
    if entity_is_private(entity):
        return 0

    # Use prefetching to optimize fetching of permissions
    user_permissions  = EntityPermissionUser.objects.filter(entity=entity, user=user).values_list('value', flat=True)
    group_permissions = EntityPermissionGroup.objects.filter(entity=entity, group__in=groups).values_list('value', flat=True)

    # Calculate permissions efficiently
    perms = sum(user_permissions) | sum(group_permissions)

    # entity inherits permissions of its parent
    if entity.parent:
        perms |= getUserPermissionsForEntityAsNumber(entity.parent, user, groups)

    return perms

# method returns permission for given pair (entry, user) from tables entitypermissiongroup and entitypermissionuser
def getUserPermissionsForEntity(entity, user):
  if (user.uid != entity.owner and entity_is_private(entity)):
    return []
  try:
    epu = EntityPermissionUser.objects.get(entity=entity, user=user)
    return [{'type':'u', 'name':user.username, 'id':user.uid, 'permissions': epu.value}]
  except:
    return []

def getGroupsPermissionsForEntity(entity, groups):
  perms = []
  for g in groups:
    try:
      epg = EntityPermissionGroup.objects.get(entity=entity, group=g)
      perms.append({'type':'g', 'name': epg.group.name, 'id': epg.group.id, 'permissions': epg.value})
    except:
        pass
  return perms


def getPermissions(uid: str) :
    permissions = []
    if is_null_or_empty(uid):
      return permissions
    try:
        user = User.objects.get(uid=uid)

        group_set = {gu.group for gu in Group_User.objects.filter(user=user)}  # set of user's groups
        group_set.add(Group.objects.get(pk=(GROUP_ANONYMOUS if uid == USER_ANONYMOUS else GROUP_EVERYONE)))

        for e in Entities.objects.all():
          perms = getUserPermissionsForEntityAsNumber(e,user,group_set)
          permissions.append({'eid':e.id, 'permissions':perms})
    except Exception:
        pass
    return permissions



# # # ############### Tools ############### # # #

def run_query(query: str, query_parameters=[]) -> list:
    try:
        data = None
        if connection is None or connection.cursor() is None or is_null_or_empty(query):
            return []
        with connection.cursor() as cursor:
            cursor.execute(query, query_parameters)
            data = list(cursor.fetchall())
        return data
    except Exception:
        return []

def is_valid_request_and_data(request, data=None, fields=None):
    if request is None:
      return False
    if data and fields:
        for key in fields:
            if not key in data or not data[key]:
                return False
    return True

def is_null_or_empty(item: str) -> bool:
    """Check if item is None or empty.

    Args:
        item (str): Parameter for checking

    Returns:
        bool: Return True if item is not empty or None.
    """
    return item is None or not item.strip()


def is_valid_id(prefix: str, data: str) -> bool:
    """This function check if data is valid id, with following prefix.

    Args:
        prefix (str): allows only {u, g, e, et, p, pt}
        data (str): id

    Returns:
        bool: Checks if data is valid.
    """
    return prefix in ['u', 'g', 'e', 'et', 'p', 'pt'] and not is_null_or_empty(data) and re.match(r"^"+prefix+r"[a-zA-Z0-9_]+$", data)
