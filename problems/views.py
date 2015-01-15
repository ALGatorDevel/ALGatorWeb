from django.template.defaulttags import register
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from django.template.context import RequestContext

from Classes.FolderScraper import FolderScraper  # scrapes different JSON files and puts them together in objects.

@login_required
def problems(request):

    scraper = FolderScraper()

    return render_to_response(
        'index.html',
        {
            'projects_list': scraper.projects_list,
        }
        , context_instance=RequestContext(request)
    )

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
