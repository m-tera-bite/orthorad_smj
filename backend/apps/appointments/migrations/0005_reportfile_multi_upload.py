import django.db.models.deletion
from django.db import migrations, models


def _upload_to(instance, filename):
    return f"reports/{instance.report.appointment_id}/{filename}"


def migrate_fwd(apps, schema_editor):
    Report = apps.get_model("appointments", "Report")
    ReportFile = apps.get_model("appointments", "ReportFile")
    for report in Report.objects.exclude(file="").filter(file__isnull=False):
        val = report.file
        file_path = val.name if hasattr(val, "name") else str(val)
        if not file_path:
            continue
        rf = ReportFile(report=report, original_name=file_path.rsplit("/", 1)[-1])
        rf.file = file_path
        rf.save()


def migrate_rev(apps, schema_editor):
    apps.get_model("appointments", "ReportFile").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0004_seed_services_and_categories"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReportFile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="files", to="appointments.report")),
                ("file", models.FileField(upload_to=_upload_to)),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.RunPython(migrate_fwd, migrate_rev),
        migrations.RemoveField(model_name="report", name="file"),
    ]
