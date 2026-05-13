"""媒体库 API 路由。"""

from django.urls import path

from .views import (
    media_file_list_view,
    media_file_upload_view,
    media_image_detail_view,
    media_image_list_view,
    media_upload_view,
)


urlpatterns = [
    path("media/files/", media_file_list_view, name="api_media_file_list"),
    path("media/files/upload/", media_file_upload_view, name="api_media_file_upload"),
    path("media/images/", media_image_list_view, name="api_media_image_list"),
    path("media/images/<int:image_id>/", media_image_detail_view, name="api_media_image_detail"),
    path("media/upload/", media_upload_view, name="api_media_upload"),
]
