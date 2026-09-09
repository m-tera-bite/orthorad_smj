from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.appointments.models import Appointment, Report, ReportFile, Service

from .models import Partner, PartnerUser


def make_appointment(service, partner=None, email="pac@example.com", name="Paciente Uno"):
    return Appointment.objects.create(
        patient_name=name,
        patient_email=email,
        patient_phone="+502 1111 1111",
        service=service,
        scheduled_at=timezone.now() + timedelta(days=1),
        referring_partner=partner,
    )


class PartnerPortalTestCase(APITestCase):
    def setUp(self):
        self.service = Service.objects.create(name="Radiografía Panorámica")

        self.partner_a = Partner.objects.create(name="Clínica A")
        self.partner_b = Partner.objects.create(name="Clínica B")

        self.user_a = User.objects.create_user("a@clinica-a.com", email="a@clinica-a.com")
        PartnerUser.objects.create(user=self.user_a, partner=self.partner_a)

        self.user_b = User.objects.create_user("b@clinica-b.com", email="b@clinica-b.com")
        PartnerUser.objects.create(user=self.user_b, partner=self.partner_b)

        self.staff = User.objects.create_user("staff@x.com", email="staff@x.com", is_staff=True)
        self.patient = User.objects.create_user("pat@x.com", email="pat@x.com")

        # Same patient email referred by A, by B, and walk-in (no partner)
        self.appt_a = make_appointment(self.service, self.partner_a)
        self.appt_b = make_appointment(self.service, self.partner_b)
        self.appt_none = make_appointment(self.service, None)

        self.report_a = Report.objects.create(appointment=self.appt_a)
        ReportFile.objects.create(report=self.report_a, original_name="rx.pdf")

    # ---------------- scoping ----------------

    def test_partner_sees_only_own_appointments(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/partners/portal/appointments/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.json()]
        self.assertEqual(ids, [self.appt_a.id])
        self.assertEqual(len(res.json()[0]["report"]["files"]), 1)

    def test_same_patient_other_clinic_results_hidden(self):
        self.client.force_authenticate(self.user_b)
        res = self.client.get(
            "/api/partners/portal/appointments/?patient_email=pac@example.com"
        )
        ids = [row["id"] for row in res.json()]
        self.assertEqual(ids, [self.appt_b.id])  # not appt_a, not appt_none

    def test_partner_patients_scoped(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/partners/portal/patients/")
        self.assertEqual(res.status_code, 200)
        rows = res.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["appointment_count"], 1)

    def test_inactive_partner_loses_access(self):
        self.partner_a.is_active = False
        self.partner_a.save()
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/partners/portal/appointments/")
        self.assertEqual(res.status_code, 403)

    def test_portal_requires_partner_account(self):
        for user in (self.patient, None):
            if user:
                self.client.force_authenticate(user)
            else:
                self.client.force_authenticate(None)
            res = self.client.get("/api/partners/portal/appointments/")
            self.assertIn(res.status_code, (401, 403))

    def test_portal_me(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/partners/portal/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["partner"]["name"], "Clínica A")

    # ---------------- read-only enforcement ----------------

    def test_partner_cannot_write_anywhere(self):
        self.client.force_authenticate(self.user_a)
        attempts = [
            ("delete", f"/api/appointments/{self.appt_a.id}/", None),
            ("patch", f"/api/appointments/{self.appt_a.id}/", {"status": "cancelled"}),
            ("put", f"/api/appointments/{self.appt_a.id}/", {}),
            ("get", "/api/appointments/", None),  # generic listing is staff-only
            ("post", f"/api/appointments/{self.appt_a.id}/report/upload/", {}),
            (
                "delete",
                f"/api/appointments/{self.appt_a.id}/report/files/{self.report_a.files.first().id}/",
                None,
            ),
            ("get", "/api/partners/", None),
            ("post", "/api/partners/", {"name": "X"}),
            ("delete", f"/api/partners/{self.partner_a.id}/", None),
            ("post", f"/api/partners/{self.partner_a.id}/users/", {"email": "x@y.com"}),
        ]
        for method, url, data in attempts:
            res = getattr(self.client, method)(url, data, format="multipart" if "upload" in url else None)
            if method == "get" and url == "/api/appointments/":
                # staff-only queryset returns empty for non-staff… permission now blocks it
                self.assertIn(res.status_code, (403,), msg=url)
            else:
                self.assertIn(res.status_code, (403, 405), msg=f"{method} {url} -> {res.status_code}")
        self.assertTrue(Appointment.objects.filter(pk=self.appt_a.id).exists())
        self.assertTrue(ReportFile.objects.exists())

    def test_anonymous_can_still_book(self):
        res = self.client.post(
            "/api/appointments/",
            {
                "patient_name": "Nuevo",
                "patient_email": "n@x.com",
                "patient_phone": "123",
                "service": self.service.id,
                "scheduled_at": (timezone.now() + timedelta(days=2)).isoformat(),
            },
        )
        self.assertEqual(res.status_code, 201, res.content)

    def test_anonymous_cannot_set_referring_partner(self):
        res = self.client.post(
            "/api/appointments/",
            {
                "patient_name": "Nuevo",
                "patient_email": "n@x.com",
                "patient_phone": "123",
                "service": self.service.id,
                "scheduled_at": (timezone.now() + timedelta(days=2)).isoformat(),
                "referring_partner": self.partner_a.id,
            },
        )
        self.assertEqual(res.status_code, 400)

    # ---------------- staff management ----------------

    def test_staff_can_crud_partners_and_assign(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/partners/", {"name": "Clínica C", "phone": "555"})
        self.assertEqual(res.status_code, 201, res.content)
        partner_id = res.json()["id"]

        res = self.client.get("/api/partners/")
        self.assertEqual(res.status_code, 200)

        res = self.client.patch(f"/api/partners/{partner_id}/", {"contact_name": "Dra. X"})
        self.assertEqual(res.status_code, 200)

        # staff can assign a referring partner on an appointment
        res = self.client.patch(
            f"/api/appointments/{self.appt_none.id}/", {"referring_partner": partner_id}
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.appt_none.refresh_from_db()
        self.assertEqual(self.appt_none.referring_partner_id, partner_id)

    def test_staff_links_partner_user_by_email(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post(
            f"/api/partners/{self.partner_a.id}/users/", {"email": "nuevo@clinica-a.com"}
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["email"], "nuevo@clinica-a.com")
        # Supabase key not configured in tests → not created, message present
        self.assertFalse(body["supabase_created"])
        self.assertIn("supabase_message", body)
        self.assertTrue(
            PartnerUser.objects.filter(
                partner=self.partner_a, user__email="nuevo@clinica-a.com"
            ).exists()
        )

        # duplicate link rejected
        res = self.client.post(
            f"/api/partners/{self.partner_b.id}/users/", {"email": "nuevo@clinica-a.com"}
        )
        self.assertEqual(res.status_code, 400)

        # staff emails rejected
        res = self.client.post(
            f"/api/partners/{self.partner_a.id}/users/", {"email": "staff@x.com"}
        )
        self.assertEqual(res.status_code, 400)

        # unlink
        link = PartnerUser.objects.get(user__email="nuevo@clinica-a.com")
        res = self.client.delete(f"/api/partners/{self.partner_a.id}/users/{link.id}/")
        self.assertEqual(res.status_code, 204)

    def test_me_endpoint_includes_partner(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.get("/api/portal/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["partner"]["name"], "Clínica A")

        self.client.force_authenticate(self.patient)
        res = self.client.get("/api/portal/me/")
        self.assertIsNone(res.json()["user"]["partner"])
