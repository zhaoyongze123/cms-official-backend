from django.contrib import admin
from django.utils.html import format_html
from .models import ImageItem, FileItem

@admin.register(ImageItem)
class ImageItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'preview', 'uploaded_at')
    search_fields = ('title', 'file')
    list_display_links = ('id', 'title', 'preview')
    
    def preview(self, obj):
        if obj.file:
            return format_html('<img src="{}" style="max-height: 50px; max-width: 100px;" />', obj.file.url)
        return "无图片"
    preview.short_description = '预览图'

@admin.register(FileItem)
class FileItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'file', 'uploaded_at')
    search_fields = ('title', 'file')
