from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart

from apps.media_library.models import FileItem, ImageItem


class MediaUploadApiTests(TestCase):
    def test_upload_image_returns_media_payload(self):
        response = self.client.post(
            "/api/media/upload/",
            data={
                "title": "编辑器配图",
                "alt_text": "用于 SEO 示例的配图",
                "file": SimpleUploadedFile("cover.png", b"fake-image-bytes", content_type="image/png"),
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["title"], "编辑器配图")
        self.assertEqual(payload["alt_text"], "用于 SEO 示例的配图")
        self.assertIn("/media/library/images/", payload["file_url"])

    def test_upload_requires_image_file(self):
        response = self.client.post(
            "/api/media/upload/",
            data={
                "file": SimpleUploadedFile("notes.txt", b"text", content_type="text/plain"),
            },
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_patch_image_updates_title_and_alt_text(self):
        image = ImageItem.objects.create(
            title="旧名称",
            alt_text="旧 alt",
            file=SimpleUploadedFile("cover.png", b"fake-image-bytes", content_type="image/png"),
        )

        response = self.client.patch(
            f"/api/media/images/{image.id}/",
            data='{"title":"新名称","alt_text":"新的图片描述"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["title"], "新名称")
        self.assertEqual(payload["alt_text"], "新的图片描述")

        image.refresh_from_db()
        self.assertEqual(image.title, "新名称")
        self.assertEqual(image.alt_text, "新的图片描述")

    def test_patch_image_can_replace_underlying_file(self):
        image = ImageItem.objects.create(
            title="原图",
            alt_text="原图 alt",
            file=SimpleUploadedFile("before.png", b"before-image-bytes", content_type="image/png"),
        )
        original_file_name = image.file.name

        payload = encode_multipart(
            BOUNDARY,
            {
                "title": "替换后图片",
                "alt_text": "替换后的图片描述",
                "file": SimpleUploadedFile("after.png", b"after-image-bytes", content_type="image/png"),
            },
        )
        response = self.client.generic(
            "PATCH",
            f"/api/media/images/{image.id}/",
            payload,
            content_type=MULTIPART_CONTENT,
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["title"], "替换后图片")
        self.assertEqual(payload["alt_text"], "替换后的图片描述")
        self.assertIn("after", payload["file_url"])

        image.refresh_from_db()
        self.assertEqual(image.title, "替换后图片")
        self.assertEqual(image.alt_text, "替换后的图片描述")
        self.assertNotEqual(image.file.name, original_file_name)

    def test_file_list_returns_uploaded_files(self):
        file_item = FileItem.objects.create(
            title="产品白皮书.pdf",
            file=SimpleUploadedFile("whitepaper.pdf", b"fake-pdf-bytes", content_type="application/pdf"),
        )

        response = self.client.get("/api/media/files/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload[0]["file_id"], file_item.id)
        self.assertEqual(payload[0]["title"], "产品白皮书.pdf")
        self.assertIn("/media/library/files/", payload[0]["file_url"])

    def test_upload_file_returns_media_payload(self):
        response = self.client.post(
            "/api/media/files/upload/",
            data={
                "title": "部署手册",
                "file": SimpleUploadedFile("manual.pdf", b"fake-pdf-bytes", content_type="application/pdf"),
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["title"], "部署手册")
        self.assertEqual(payload["file_name"], "manual.pdf")
        self.assertIn("/media/library/files/", payload["file_url"])
