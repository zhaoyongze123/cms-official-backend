from django.urls import path
from . import views

app_name = "simple_cms"

urlpatterns = [
    path("", views.ArticleListView.as_view(), name="article_list"),
    path("search/", views.SearchArticleListView.as_view(), name="article_search"),
    path("category/<slug:slug>/", views.CategoryArticleListView.as_view(), name="category_list"),
    path("tag/<slug:slug>/", views.TagArticleListView.as_view(), name="tag_list"),
    path("id/<int:pk>/", views.ArticleDetailByIdView.as_view(), name="article_detail_by_id"),
    path("<path:slug>/", views.ArticleDetailView.as_view(), name="article_detail"),
]
