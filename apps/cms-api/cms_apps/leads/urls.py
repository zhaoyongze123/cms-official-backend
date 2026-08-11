from django.urls import path

from .api import public_lead_create_view


urlpatterns = [
    path("public/leads/", public_lead_create_view, name="api_public_lead_create"),
]
