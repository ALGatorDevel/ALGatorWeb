#views.py
from login.forms import *
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.views.decorators.csrf import csrf_protect
from django.shortcuts import render
from django.shortcuts import redirect
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.template.defaulttags import register

from django.contrib.auth.forms import AuthenticationForm

from login.models import UserProfile, ProfileForm
from django.contrib.auth import authenticate
from django.contrib.auth import login as auth_login


@register.filter
def field_type(field):
    """
    Get the name of the form field class.
    """
    if hasattr(field, 'field'):
        field = field.field
    s = str(type(field.widget).__name__)
    s = s.rpartition('Input')[0]
    s = s.lower()
    return s

@csrf_protect
def login(request): 
    return render(request, 'registration/login.html',{'form': AuthenticationForm()})

def dologin(request):
  if request.method == 'POST':
    form = AuthenticationForm(request.POST)
    username = request.POST.get('username', '')
    password = request.POST.get('password', '')
    user = authenticate(username=username, password=password)

    if user is not None:
      if user.is_active:
        auth_login(request, user)
        # messages.success(request, "You have logged in!")  
        return redirect("/") #request.GET.get('next'))
    else:    
      return render(request, 'registration/login.html',{'form': form})


@csrf_protect
def register(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
            username=form.cleaned_data['username'],
            password=form.cleaned_data['password1'],
            email=form.cleaned_data['email']
            )
            return HttpResponseRedirect('/register/success/')
    else:
        form = RegistrationForm()
 
    return render(request, 
        'registration/register.html',
        {
          'form': form
        }       
    )


def register_success(request):
    return render(request,'registration/success.html', {})


def logout_page(request):
    logout(request)
    return HttpResponseRedirect('/')
 
def home(request):
    return render(request, 
        'home.html',
        {'user': request.user}
    )

#@login_required
def settings_page(request):
    try:
        profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        profile = None

    form = ProfileForm(request.POST or None, instance=profile)

    if request.method == 'POST':
        if form.is_valid():
            form.save()
            return HttpResponseRedirect('/settings/')
    return render(request, 
        'profile.html',
        {'form': form}
    )



