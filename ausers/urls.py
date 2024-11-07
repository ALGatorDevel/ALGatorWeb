from django.urls import path

import ausers.views as views

urlpatterns = [
    path("login/", views.userLogin, name="login"),
    path("logout/", views.userLogout, name="logout"),
    path("signup/", views.userSignup, name="signup"),

    path('get_users', views.get_users, name='get_users'),
    path('add_user', views.add_user, name='add_user'),
    path('remove_user', views.remove_user, name='remove_user'),
    path('edit_user', views.edit_user, name='edit_user'),
    path('get_permissions', views.get_permissions, name='entities_permissions'),
    path('add_permission', views.add_permission, name='add_permission'),
    path('remove_permission', views.remove_permission, name='remove_permission'),

    path('set_private', views.set_private, name='set_private'),
    path('get_entities_permissions', views.get_entities_permissions, name='entities_permissions'),
    path('get_groups', views.get_groups, name='get_groups'),
    path('add_group', views.add_group, name='add_group'),
    path('remove_group', views.remove_group, name='remove_group'),
    path('add_groupusers', views.add_groupusers, name='add_groupusers'),
    path('remove_groupuser', views.remove_groupuser, name='remove_groupuser'),
    path('get_groupsuser', views.get_groupsuser, name='get_groupsuser'),
    path('get_permissions_eid', views.get_all_user_permissions_by_eid, name='get_all_user_permissions_by_eid'),
    path('get_entities', views.get_entities, name='get_entities'),
    path('get_all_permission_types', views.get_all_permission_types, name='get_all_permission_types'),
    path('get_all_user_permissions_by_eid', views.get_all_user_permissions_by_eid, name='get_all_user_permissions_by_eid'),
    path('get_all_permission_types_for_entities', views.get_all_permission_types_for_entities, name='get_all_permission_types_for_entities'),

    #path('users/get_groups', views.get_groups, name='get_groups'),

    path('can', views.can, name='can'),

    path('xc', views.xc, name='xc'),
    path('settings/', views.settings, name='settings'),
]
