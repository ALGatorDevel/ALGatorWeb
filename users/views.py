from urllib.parse import urlencode
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout 
from django.shortcuts import render, redirect
from .forms import LoginForm, SignupForm, EditUserForm
from django.contrib.auth.forms import PasswordChangeForm
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

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
    next_page = request.POST.get('next')  or '/'

    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            password1 = form.cleaned_data['password1']
            password2 = form.cleaned_data['password2']
            form.save()
            if next_page:
              return HttpResponseRedirect(next_page)
            else:
              return redirect('main:home')
    else:
        form = SignupForm()
    return render(request, 'signup.html', {'form': form})


def userLogout(request):
    logout(request)
    next_page = request.POST.get('next')  or '/'
    if next_page:
      return HttpResponseRedirect(next_page)
    else:
      return redirect('main:home')

@login_required
def userProfile(request):
    user = request.user
    return render(request, 'profile.html', {'user': user})

@login_required
@csrf_protect
def editUserProfile(request):
    user = request.user
    
    if request.method == 'POST':
        edit_form = EditUserForm(request.POST, instance=user)
        if edit_form.is_valid():
            edit_form.save()
            return redirect('users:profile')  
        
    else:
        edit_form = EditUserForm(instance=user)
    
    return render(request, 'editProfile.html', {'edit_form': edit_form})

@login_required
@csrf_protect
def editUserPassword(request):
    user = request.user
    if request.method == 'POST':
        password_form = PasswordChangeForm(user, request.POST)
        if password_form.is_valid():
            user = password_form.save()
            return redirect('users:login')  
    else:
        password_form = PasswordChangeForm(user)
    
    return render(request, 'editPassword.html', {'password_form': password_form})

