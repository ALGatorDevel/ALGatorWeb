from django.contrib.auth.models import AbstractUser
from django.db import models
from main.autils import rand_str
from ausers.auconsts import USER_ROOT


class User(AbstractUser):
    uid   = models.CharField(max_length=16, unique=True)
    owner = models.CharField(blank=True, default=USER_ROOT, max_length=16)
    affiliation = models.EmailField(blank=True, max_length=254, verbose_name='Institution and department')
    address = models.EmailField(blank=True, max_length=254, verbose_name='Address')
    country = models.EmailField(blank=True, max_length=254, verbose_name='Country')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.uid.startswith('u'):
            self.uid = (f'u{self.id}_' + str(self.uid))[:14]
            super().save(*args, **kwargs)


class Group(models.Model):
    id = models.CharField(max_length=16, default='', primary_key=True)
    owner = models.ForeignKey(User, on_delete=models.DO_NOTHING, to_field='uid')
    name = models.CharField(max_length=255, default='', unique=True)
    description = models.CharField(max_length=255, default='')

    def save(self, *args, **kwargs):
      if not self.id.startswith('g'):
        self.id = (f'g{Group.objects.count()}_' + str(self.id))[:14]
        super().save(*args, **kwargs)


class Group_User(models.Model):
    group = models.ForeignKey(Group, on_delete=models.DO_NOTHING)
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, to_field='uid')


class EntityType(models.Model):
    id = models.CharField(max_length=16, default='', primary_key=True)
    name = models.CharField(max_length=255, default='')


class Entities(models.Model):
    id = models.CharField(max_length=16, default='', primary_key=True)
    name = models.CharField(max_length=255, default='')
    entity_type = models.ForeignKey(EntityType, on_delete=models.DO_NOTHING)
    is_private = models.BooleanField(default=1)
    parent = models.ForeignKey('self', max_length=16, blank=True, null=True, on_delete=models.CASCADE)
    owner = models.ForeignKey(User, on_delete=models.DO_NOTHING, to_field='uid')

class PermissionType(models.Model):
    id = models.CharField(max_length=16, default='', primary_key=True)
    name = models.CharField(max_length=255, default='')
    codename = models.CharField(max_length=255, default='')
    value = models.IntegerField(default=0)


class EntityPermissionUser(models.Model):
    entity = models.ForeignKey(Entities, on_delete=models.DO_NOTHING)
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, to_field='uid')
    value = models.IntegerField(default=0)

    # permission = models.ForeignKey(PermissionType, on_delete=models.DO_NOTHING)
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['entity', 'user'], name='unique_entity_user'
            )
        ]


class EntityPermissionGroup(models.Model):
    entity = models.ForeignKey(Entities, on_delete=models.DO_NOTHING)
    group = models.ForeignKey(Group, on_delete=models.DO_NOTHING)
    value = models.IntegerField(default=0)

    # permission = models.ForeignKey(PermissionType, on_delete=models.DO_NOTHING)
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['entity', 'group'], name='unique_entity_group'
            )
        ]


class Entity_permission(models.Model):
    permission_type = models.ForeignKey(PermissionType, on_delete=models.DO_NOTHING)
    entity_type = models.ForeignKey(EntityType, on_delete=models.DO_NOTHING)