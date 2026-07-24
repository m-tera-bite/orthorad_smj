from django.db import migrations

CATEGORIES = [
    ("Radiografías Extraorales", 1),
    ("Radiografías Intraorales", 2),
    ("Tomografías CBCT", 3),
]

SERVICES = [
    # (name, duration_minutes, category_name)
    ("Radiografía Panorámica",                  10, "Radiografías Extraorales"),
    ("Lateral de Cráneo / Cefalométrica",        15, "Radiografías Extraorales"),
    ("Trazado Cefalométrico",                    15, "Radiografías Extraorales"),
    ("Radiografía ATM",                          15, "Radiografías Extraorales"),
    ("Anteroposterior",                          10, "Radiografías Extraorales"),
    ("Posteroanterior",                          10, "Radiografías Extraorales"),
    ("Senos Paranasales (Waters)",               10, "Radiografías Extraorales"),
    ("Carpal",                                   10, "Radiografías Extraorales"),
    ("Vías Aéreas",                              10, "Radiografías Extraorales"),
    ("Set Completo Diagnóstico (18 Rxs)",        30, "Radiografías Intraorales"),
    ("Interproximales",                          15, "Radiografías Intraorales"),
    ("Periapicales",                             15, "Radiografías Intraorales"),
    ("CBCT Completa (Maxilar Superior e Inferior)", 25, "Tomografías CBCT"),
    ("CBCT Maxilar Superior",                    20, "Tomografías CBCT"),
    ("CBCT Maxilar Inferior",                    20, "Tomografías CBCT"),
    ("CBCT para Endodoncia",                     20, "Tomografías CBCT"),
    ("CBCT para Implantes",                      20, "Tomografías CBCT"),
    ("CBCT ATM",                                 20, "Tomografías CBCT"),
    ("CBCT Vías Aéreas",                         20, "Tomografías CBCT"),
    ("Escáner",                                  20, "Tomografías CBCT"),
]


def seed_services(apps, schema_editor):
    ServiceCategory = apps.get_model("appointments", "ServiceCategory")
    Service = apps.get_model("appointments", "Service")

    cat_map = {}
    for name, order in CATEGORIES:
        cat = ServiceCategory.objects.create(name=name, order=order)
        cat_map[name] = cat

    for name, duration, cat_name in SERVICES:
        Service.objects.create(
            name=name,
            duration_minutes=duration,
            category=cat_map[cat_name],
            is_active=True,
        )


def unseed_services(apps, schema_editor):
    ServiceCategory = apps.get_model("appointments", "ServiceCategory")
    Service = apps.get_model("appointments", "Service")
    Service.objects.filter(name__in=[s[0] for s in SERVICES]).delete()
    ServiceCategory.objects.filter(name__in=[c[0] for c in CATEGORIES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0003_servicecategory_service_category"),
    ]

    operations = [
        migrations.RunPython(seed_services, unseed_services),
    ]
