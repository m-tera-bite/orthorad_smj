from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.appointments.models import Appointment, Report, ReportFile, Service
from apps.partners.models import Partner, PartnerUser

from .models import AuditLog


def _make_appointment(**overrides):
    service = overrides.pop("service", None) or Service.objects.create(
        name="Radiografía Panorámica", duration_minutes=30
    )
    defaults = {
        "patient_name": "Juan Pérez",
        "patient_email": "juan@example.com",
        "patient_phone": "5555-5555",
        "service": service,
        "scheduled_at": timezone.now() + timedelta(days=1),
    }
    defaults.update(overrides)
    return Appointment.objects.create(**defaults)


class SoftDeleteAndAuditTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff@orthorad.com", email="staff@orthorad.com", is_staff=True
        )
        self.client.force_authenticate(self.staff)

    # ------------------------------------------------------------------
    # Appointments
    # ------------------------------------------------------------------

    def test_delete_appointment_soft_deletes_and_logs(self):
        appt = _make_appointment()
        res = self.client.delete(f"/api/appointments/{appt.id}/")
        self.assertEqual(res.status_code, 204)

        # Hidden from normal queries, still in the database
        self.assertFalse(Appointment.objects.filter(pk=appt.id).exists())
        row = Appointment.all_objects.get(pk=appt.id)
        self.assertIsNotNone(row.deleted_at)
        self.assertEqual(row.deleted_by, self.staff)

        entry = AuditLog.objects.filter(
            action=AuditLog.Action.DELETE, object_type="appointment"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor, self.staff)
        self.assertEqual(entry.details["cita_eliminada"]["paciente"], "Juan Pérez")

    def test_deleted_appointment_leaves_lists(self):
        appt = _make_appointment()
        self.client.delete(f"/api/appointments/{appt.id}/")
        res = self.client.get("/api/appointments/?date=all")
        ids = [a["id"] for a in res.json()]
        self.assertNotIn(appt.id, ids)

    def test_status_change_is_logged(self):
        appt = _make_appointment()
        res = self.client.patch(f"/api/appointments/{appt.id}/", {"status": "confirmed"})
        self.assertEqual(res.status_code, 200)
        appt.refresh_from_db()
        self.assertEqual(appt.status, "confirmed")
        entry = AuditLog.objects.filter(action=AuditLog.Action.UPDATE).first()
        self.assertIsNotNone(entry)
        self.assertIn("status", entry.details["cambios"])

    def test_public_cannot_set_status_on_booking(self):
        service = Service.objects.create(name="CBCT", duration_minutes=30)
        self.client.force_authenticate(None)
        res = self.client.post(
            "/api/appointments/",
            {
                "patient_name": "Ana",
                "patient_email": "ana@example.com",
                "patient_phone": "1234",
                "service": service.id,
                "scheduled_at": (timezone.now() + timedelta(days=2)).isoformat(),
                "status": "completed",
            },
        )
        self.assertEqual(res.status_code, 400)

    def test_non_staff_cannot_delete_appointment(self):
        appt = _make_appointment()
        outsider = User.objects.create_user(username="x@y.com", email="x@y.com")
        self.client.force_authenticate(outsider)
        res = self.client.delete(f"/api/appointments/{appt.id}/")
        self.assertIn(res.status_code, (403, 404))
        self.assertTrue(Appointment.objects.filter(pk=appt.id).exists())

    # ------------------------------------------------------------------
    # Patients (aggregated from appointments)
    # ------------------------------------------------------------------

    def test_delete_patient_removes_all_their_appointments(self):
        a1 = _make_appointment()
        a2 = _make_appointment(
            service=a1.service, scheduled_at=timezone.now() + timedelta(days=3)
        )
        other = _make_appointment(
            service=a1.service, patient_email="otra@example.com", patient_name="Otra"
        )

        res = self.client.delete("/api/appointments/patients/?email=juan@example.com")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["deleted_appointments"], 2)

        self.assertFalse(Appointment.objects.filter(pk__in=[a1.id, a2.id]).exists())
        self.assertTrue(Appointment.objects.filter(pk=other.id).exists())

        entry = AuditLog.objects.filter(
            action=AuditLog.Action.DELETE, object_type="patient"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(len(entry.details["citas_eliminadas"]), 2)

    # ------------------------------------------------------------------
    # Partners
    # ------------------------------------------------------------------

    def test_delete_partner_soft_deletes_deactivates_and_logs(self):
        partner = Partner.objects.create(name="Clínica Sonrisa")
        portal_user = User.objects.create_user(
            username="socio@sonrisa.com", email="socio@sonrisa.com"
        )
        PartnerUser.objects.create(user=portal_user, partner=partner)

        res = self.client.delete(f"/api/partners/{partner.id}/")
        self.assertEqual(res.status_code, 204)

        self.assertFalse(Partner.objects.filter(pk=partner.id).exists())
        row = Partner.all_objects.get(pk=partner.id)
        self.assertIsNotNone(row.deleted_at)
        self.assertFalse(row.is_active)

        # Its portal users no longer pass the partner permission
        # (re-fetch to drop the relation cached at creation time)
        portal_user = User.objects.get(pk=portal_user.pk)
        self.client.force_authenticate(portal_user)
        res = self.client.get("/api/partners/portal/patients/")
        self.assertEqual(res.status_code, 403)

        entry = AuditLog.objects.filter(
            action=AuditLog.Action.DELETE, object_type="partner"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.details["clinica_eliminada"]["nombre"], "Clínica Sonrisa")

    # ------------------------------------------------------------------
    # Report files (results)
    # ------------------------------------------------------------------

    def test_delete_report_file_soft_deletes_and_logs(self):
        appt = _make_appointment()
        report = Report.objects.create(appointment=appt, uploaded_at=timezone.now())
        rf = ReportFile.objects.create(report=report, original_name="estudio.pdf")

        res = self.client.delete(f"/api/appointments/{appt.id}/report/files/{rf.id}/")
        self.assertEqual(res.status_code, 204)

        self.assertFalse(ReportFile.objects.filter(pk=rf.id).exists())
        self.assertIsNotNone(ReportFile.all_objects.get(pk=rf.id).deleted_at)
        report.refresh_from_db()
        self.assertIsNone(report.uploaded_at)

        entry = AuditLog.objects.filter(
            action=AuditLog.Action.DELETE, object_type="report_file"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.details["archivo"], "estudio.pdf")

    # ------------------------------------------------------------------
    # Audit endpoint
    # ------------------------------------------------------------------

    def test_audit_endpoint_is_staff_only(self):
        outsider = User.objects.create_user(username="p@p.com", email="p@p.com")
        self.client.force_authenticate(outsider)
        res = self.client.get("/api/audit/")
        self.assertEqual(res.status_code, 403)

    def test_audit_endpoint_lists_and_filters(self):
        appt = _make_appointment()
        self.client.delete(f"/api/appointments/{appt.id}/")

        res = self.client.get("/api/audit/?action=delete")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["count"], 1)
        self.assertTrue(all(r["action"] == "delete" for r in data["results"]))

        res = self.client.get("/api/audit/?exclude_views=1")
        self.assertTrue(all(r["action"] != "view" for r in res.json()["results"]))

    def test_reads_are_logged(self):
        self.client.get("/api/appointments/patients/")
        entry = AuditLog.objects.filter(
            action=AuditLog.Action.VIEW, object_type="patient"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor, self.staff)
