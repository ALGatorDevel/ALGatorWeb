from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.userLogin, name="login"),
    path("logout/", views.userLogout, name="logout"),
    path("signup/", views.userSignup, name="signup"),
    path("profile/", views.userProfile, name="profile"),
    path("edit-profile/", views.editUserProfile, name="edit-profile"),
    path("edit-password/", views.editUserPassword, name="edit-password"),
]