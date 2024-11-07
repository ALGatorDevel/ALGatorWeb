# Generated by Django 3.2 on 2024-07-13 11:10
from django.contrib.auth.hashers import make_password
from django.db import migrations

from ausers.auconsts import USER_ROOT, USER_ANONYMOUS, USER_ALGATOR, GROUP_EVERYONE, GROUP_ANONYMOUS, GROUP_ROOT


class Migration(migrations.Migration):
    def insert_default_data(apps, schema_editor):
        # Users
        UserD = apps.get_model('ausers', 'User')
        root_u = UserD.objects.create(
            id=1,
            email='root@algator.com',
            username='root',
            password=make_password('root'),
            is_superuser=True,   # algator full control
            is_staff=True,       # can login django admin page
            is_active=True,
            uid=USER_ROOT
        )
        root_u.save()
        anonymous_u = UserD.objects.create(
            id=2,
            email='anonymous@algator.com',
            username='anonymous',
            password=make_password('anonymous'),
            is_superuser=False,
            is_staff=False,
            is_active=False,  # can not login
            uid=USER_ANONYMOUS
        )
        anonymous_u.save()
        algator_u = UserD.objects.create(
            id=3,
            email='algator@algator.com',
            username='algator',
            password=make_password('algator'),
            is_superuser=True,   # algator full control
            is_staff=False,            
            is_active=True,
            uid=USER_ALGATOR
        )
        algator_u.save()

        # EntityType
        EntityType = apps.get_model('ausers', 'EntityType')
        system_et = EntityType(id='et0_S', name='System')
        system_et.save()
        projects_et = EntityType(id='et0_P', name='Projects')
        projects_et.save()
        algorithms_et = EntityType(id='et0_A', name='Algorithms')
        algorithms_et.save()
        testsets_et = EntityType(id='et0_T', name='Testsets')
        testsets_et.save()
        presenters_et = EntityType(id='et0_R', name='Presenters')
        presenters_et.save()

        project_et = EntityType(id='et1', name='Project')
        project_et.save()
        algorithm_et = EntityType(id='et2', name='Algorithm')
        algorithm_et.save()
        test_set_et = EntityType(id='et3', name='Testset')
        test_set_et.save()
        presenter_et = EntityType(id='et4', name='Presenter')
        presenter_et.save()
        groups_et = EntityType(id='et5', name='Group')
        groups_et.save()

        # PermissionType
        PermissionType = apps.get_model('ausers', 'PermissionType')
        can_read_pt           = PermissionType(id='p0',    name='Can read?',            codename='can_read',            value=1)
        can_read_pt           .save()   
        can_write_pt          = PermissionType(id='p1',    name='Can write?',           codename='can_write',           value=2)
        can_write_pt          .save()   
        can_execute_pt        = PermissionType(id='p2',    name='Can execute?',         codename='can_execute',         value=4)
        can_execute_pt        .save()  
        can_add_project_pt    = PermissionType(id='p3',    name='Can add project?',     codename='can_add_project',     value=8)
        can_add_project_pt    .save()   
        can_add_algorithm_pt  = PermissionType(id='p4',    name='Can add algorithm?',   codename='can_add_algorithm',   value=16)
        can_add_algorithm_pt  .save()   
        can_add_testset_pt    = PermissionType(id='p5',    name='Can add test set?',    codename='can_add_testset',     value=32)
        can_add_testset_pt    .save()   
        can_add_presenter_pt  = PermissionType(id='p6',    name='Can add presenter?',   codename='can_add_presenter',   value=64)
        can_add_presenter_pt  .save()   
        can_edit_rights_pt    = PermissionType(id='p7',    name='Can edit rights?',     codename='can_edit_rights',     value=128)
        can_edit_rights_pt    .save()   
        can_edit_users_pt     = PermissionType(id='p8',    name='Can edit users?',      codename='can_edit_users',      value=256)
        can_edit_users_pt     .save()
        full_control_pt       = PermissionType(id='pFFFF', name='Full control',         codename='full_control',        value=0xFFFF)
        full_control_pt       .save()

        # Groups
        Group = apps.get_model('ausers', 'Group')
        everyone_g = Group(id=GROUP_EVERYONE,   name='everyone',  owner=root_u, description="Every logged-in user is a member of the 'everyone' group.")
        everyone_g.save()
        anonymous_g = Group(id=GROUP_ANONYMOUS, name='anonymous', owner=root_u, description="Every non-logged-in user is a member of the 'anonymous' group.")
        anonymous_g.save()
        anonymous_g = Group(id=GROUP_ROOT,      name='root',      owner=root_u, description="A group for users with root privileges.")
        anonymous_g.save()


        # Entities
        Entities = apps.get_model('ausers', 'Entities')
        e0_S = Entities(id='e0_S', name='System',   entity_type=system_et, is_private=False,   owner=root_u)
        e0_S.save()
        e0_P = Entities(id='e0_P', name='Projects', entity_type=projects_et, is_private=False, owner=root_u, parent_id=e0_S.id)
        e0_P.save()


        Entity_permission_group = apps.get_model('ausers', 'EntityPermissionGroup')
        Entity_permission_group(entity=e0_S, group=everyone_g, value=can_read_pt.value | can_edit_users_pt.value).save()
        Entity_permission_group(entity=e0_P, group=everyone_g, value=can_read_pt.value | can_add_project_pt.value).save()
        

        # Entity permission
        Entity_permission = apps.get_model('ausers', 'Entity_permission')
        ep00 = Entity_permission(entity_type=system_et, permission_type=can_add_project_pt).save()
          
        Entity_permission(entity_type=system_et,    permission_type=can_read_pt).save()
        Entity_permission(entity_type=system_et,    permission_type=can_edit_rights_pt).save()
        Entity_permission(entity_type=system_et,    permission_type=can_edit_users_pt).save()
        Entity_permission(entity_type=system_et,    permission_type=full_control_pt).save()

        Entity_permission(entity_type=project_et,   permission_type=can_read_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_write_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_execute_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_add_project_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_add_algorithm_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_add_testset_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_add_presenter_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=can_edit_rights_pt).save()
        Entity_permission(entity_type=project_et,   permission_type=full_control_pt).save()
        # duplicate permissions for "project" to "Projects"
        for prm in Entity_permission.objects.filter(entity_type=project_et):
            Entity_permission(entity_type=projects_et, permission_type=prm.permission_type).save()
        
        Entity_permission(entity_type=algorithm_et, permission_type=can_read_pt).save()
        Entity_permission(entity_type=algorithm_et, permission_type=can_write_pt).save()
        Entity_permission(entity_type=algorithm_et, permission_type=can_execute_pt).save()
        Entity_permission(entity_type=algorithm_et, permission_type=can_edit_rights_pt).save()
        Entity_permission(entity_type=algorithm_et, permission_type=full_control_pt).save()
        # duplicate permissions for "algorithm" to "Algorithms"
        for prm in Entity_permission.objects.filter(entity_type=algorithm_et):
            Entity_permission(entity_type=algorithms_et, permission_type=prm.permission_type).save()

        
        Entity_permission(entity_type=test_set_et,  permission_type=can_read_pt).save()
        Entity_permission(entity_type=test_set_et,  permission_type=can_write_pt).save()
        Entity_permission(entity_type=test_set_et,  permission_type=can_edit_rights_pt).save()
        Entity_permission(entity_type=test_set_et,  permission_type=full_control_pt).save()
        # duplicate permissions for "testset" to "Testsets"
        for prm in Entity_permission.objects.filter(entity_type=test_set_et):
            Entity_permission(entity_type=testsets_et, permission_type=prm.permission_type).save()
        
        Entity_permission(entity_type=groups_et,    permission_type=can_write_pt).save()
        Entity_permission(entity_type=groups_et,    permission_type=full_control_pt).save()
        
        Entity_permission(entity_type=presenter_et, permission_type=can_read_pt).save()
        Entity_permission(entity_type=presenter_et, permission_type=can_write_pt).save()
        Entity_permission(entity_type=presenter_et, permission_type=can_edit_rights_pt).save()
        Entity_permission(entity_type=presenter_et, permission_type=full_control_pt).save()
        # duplicate permissions for "algorithm" to "Algorithms"
        for prm in Entity_permission.objects.filter(entity_type=presenter_et):
            Entity_permission(entity_type=presenters_et, permission_type=prm.permission_type).save()

    dependencies = [
        ('ausers', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(insert_default_data),
    ]