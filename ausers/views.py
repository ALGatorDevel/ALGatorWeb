import json

from django.http import QueryDict, HttpResponseRedirect
from urllib.parse import urlencode
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect

from .autools import getUID, isAnonymousMode
from .forms import LoginForm, SignupForm, EditUserForm
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages

from . import ausers
from .auconsts import USER_ANONYMOUS
from .models import User


@csrf_protect
def userLogin(request):
    if request.method == 'POST':
        next_page = request.POST.get('next') or request.GET.get('next') or '/'
        problemName = request.POST.get('problemName') or request.GET.get('problemName') or ''
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                request.session['fav_color'] = 'blue'
                login(request, user)

                if next_page and next_page != '/' and problemName and problemName != '':
                    redirect_url = f"{next_page}?{urlencode({'problemName': problemName})}"
                    return HttpResponseRedirect(redirect_url)
                elif next_page:
                    return HttpResponseRedirect(next_page)
                else:
                    return redirect('main:home')

        form.add_error(None, "Invalid username or password.")
        messages.error(request, "Invalid username or password.")
        return render(request, 'login.html', {'loginForm': form})

    form = LoginForm()
    return render(request, 'login.html', {'loginForm': form})


@csrf_protect
def userSignup(request):
    next_page = request.POST.get('next') or '/'

    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password1 = form.cleaned_data['password1']
            try:
              form.save()

              user = authenticate(request, username=username, password=password1)
              if user is not None:
                  login(request, user)

              if next_page:
                  return HttpResponseRedirect(next_page)
              else:
                  return redirect('main:home')
            except Exception as e:
                if "for key 'ausers_user.email'" in str(e):
                    form.add_error('email', "A user with this email already exists.")
                else:
                    form.add_error(None, "An unexpected error occurred: " + str(e))
    else:
        form = SignupForm()
    return render(request, 'signup.html', {'form': form, 'form_resubmitted': request.POST.get('fr', '1') != '1'})


def userLogout(request):
    logout(request)
    return redirect('main:home')


def who(request):
    return ausers.who(request)

def info(request):
    return ausers.info(request)

def can(request):
    data = QueryDict.dict(request.GET)
    return ausers.can_request(request, data)

def get_users(request):
    return ausers.get_users(request)

def add_user(request):
    data = QueryDict.dict(request.POST)
    return ausers.add_user(request, data)

def remove_user(request):
    data = QueryDict.dict(request.POST)
    return ausers.remove_user(request, data)

def edit_user(request):
    data = QueryDict.dict(request.POST)
    return ausers.edit_user(request, data)

def set_private(request):
    data = QueryDict.dict(request.POST)
    return ausers.set_private(request, data)

def get_entities_permissions(request):
    return ausers.entities_permissions(request)

def get_permissions(request):
    return ausers.permissions(request)

def add_permission(request):
    data = QueryDict.dict(request.POST)
    return ausers.add_permission(request, data)

def remove_permission(request):
    data = QueryDict.dict(request.POST)
    return ausers.remove_permission(request, data)

def get_groups(request):
    return ausers.get_groups(request)

def add_group(request):
    data = QueryDict.dict(request.POST)
    return ausers.add_group(request, data)

def remove_group(request):
    data = QueryDict.dict(request.POST)
    return ausers.remove_group(request, data)

def get_groupsuser(request):
    return ausers.get_groupsuser(request)

def add_groupusers(request):
    users = request.POST.getlist('users[]')
    gid = request.POST.get('gid')
    data = {'gid':gid, 'users':users}
    return ausers.add_groupusers(request, data)

def remove_groupuser(request):
    data = QueryDict.dict(request.POST)
    return ausers.remove_groupuser(request, data)


def get_all_user_permissions_by_eid(request):
    data = QueryDict.dict(request.POST)
    return ausers.get_all_user_permissions_by_eid(request, data)

def get_all_permission_types_for_entities(request):
    return ausers.get_all_permission_types_for_entities(request)

def get_entities(request):
    return ausers.get_entities(request)

def get_all_permission_types(request):
    return ausers.get_all_permission_types(request)


def settings(request):
    uid = getUID(request)
    user = User.objects.get(uid=uid)
    homepoint = request.POST.get('homepoint', False)
    next      = request.POST.get('next', "/")

    return render(request, 'settings.html',
        {
          'user'      : user,
           'homepoint': homepoint,
           'next'     : next,
           'isDBMode' : not isAnonymousMode(),
        },
    )


def xc(request):
    uid = getUID(request)
    return render(request, 'xconsole.html',
        {
          'uid' : uid 
        },
    )


def sendmail(request):
    data = QueryDict.dict(request.POST)
    return ausers.sendmail(request, data)


