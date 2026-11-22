from pathlib import Path
import re

from django.test import SimpleTestCase


GUIDE_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "guia"


class StaffGuideTests(SimpleTestCase):
    def test_guide_page_is_served(self):
        res = self.client.get("/guia/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res["Content-Type"])
        self.assertEqual(res["X-Robots-Tag"], "noindex, nofollow")
        body = b"".join(res.streaming_content).decode("utf-8")
        self.assertIn("Guía del Personal", body)

    def test_guide_works_without_trailing_slash(self):
        res = self.client.get("/guia")
        self.assertEqual(res.status_code, 200)
        body = b"".join(res.streaming_content).decode("utf-8")
        self.assertIn("Guía del Personal", body)

    def test_every_image_in_the_guide_exists(self):
        html = (GUIDE_DIR / "index.html").read_text(encoding="utf-8")
        refs = re.findall(r'src="/static/guia/(img/[^"]+)"', html)
        self.assertTrue(refs)
        for ref in refs:
            self.assertTrue((GUIDE_DIR / ref).is_file(), f"missing {ref}")
