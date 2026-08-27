from django.test import TestCase

from scripts.backfill_article_editor_content import (
    build_tiptap_document_from_html,
    render_tiptap_document,
)


class ArticleEditorContentBackfillTests(TestCase):
    def test_backfill_preserves_inline_marks_lists_images_and_table_spans(self):
        document = build_tiptap_document_from_html(
            "<h2>标题 <strong>重点</strong></h2>"
            '<p>一段 <a href="https://example.com">链接</a>。</p>'
            "<ul><li>第一项<ul><li>子项</li></ul></li></ul>"
            '<figure data-align="left"><img src="/media/demo.png" width="320" alt="示例图" /></figure>'
            '<table><tr><th colspan="2">列一</th></tr><tr><td rowspan="2">A</td><td>B</td></tr></table>'
        )

        content = document["content"]
        list_node = next(node for node in content if node["type"] == "bulletList")
        image_node = next(node for node in content if node["type"] == "image")
        table_node = next(node for node in content if node["type"] == "table")

        self.assertEqual(content[0]["content"][1]["marks"][0]["type"], "bold")
        self.assertEqual(content[1]["content"][1]["marks"][0]["type"], "link")
        self.assertEqual(list_node["content"][0]["content"][0]["content"][0]["text"], "第一项")
        self.assertEqual(list_node["content"][0]["content"][1]["type"], "bulletList")
        self.assertEqual(image_node["attrs"]["align"], "left")
        self.assertEqual(image_node["attrs"]["width"], 320)
        self.assertEqual(table_node["content"][0]["content"][0]["attrs"]["colspan"], 2)
        self.assertEqual(table_node["content"][1]["content"][0]["attrs"]["rowspan"], 2)

        rendered = render_tiptap_document(document)

        self.assertIn("<strong>重点</strong>", rendered)
        self.assertIn('href="https://example.com"', rendered)
        self.assertIn("<ul><li><p>第一项</p><ul><li><p>子项</p></li></ul></li></ul>", rendered)
        self.assertIn('data-align="left"', rendered)
        self.assertIn('colspan="2"', rendered)
        self.assertIn('rowspan="2"', rendered)
