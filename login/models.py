from django.db import models
from django.forms import ModelForm
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.ForeignKey(User, unique=True)
    url = models.URLField("Website", blank=True)


class ProfileForm(ModelForm):
        class Meta:
            model = UserProfile
            exclude = ('user',)
