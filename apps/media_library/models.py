import os
from django.db import models

class ImageItem(models.Model):
    title = models.CharField('图片名称', max_length=255, blank=True)
    file = models.ImageField('选择图片', upload_to='library/images/%Y/%m/')
    uploaded_at = models.DateTimeField('上传时间', auto_now_add=True)
    
    class Meta:
        verbose_name = '图片库'
        verbose_name_plural = '图片库'

    def __str__(self):
        return self.title or os.path.basename(self.file.name)

class FileItem(models.Model):
    title = models.CharField('文件名称', max_length=255, blank=True)
    file = models.FileField('选择附件', upload_to='library/files/%Y/%m/')
    uploaded_at = models.DateTimeField('上传时间', auto_now_add=True)
    
    class Meta:
        verbose_name = '附件库'
        verbose_name_plural = '附件库'

    def __str__(self):
        return self.title or os.path.basename(self.file.name)
