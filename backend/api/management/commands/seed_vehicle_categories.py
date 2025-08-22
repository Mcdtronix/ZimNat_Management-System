from django.core.management.base import BaseCommand
from api.models import VehicleCategory

DEFAULTS = [
    ("motorcycles", "Two-wheeled motor vehicles"),
    ("light_motor", "Small private cars and light vehicles"),
    ("minibuses", "Passenger minibuses"),
    ("buses", "Large passenger buses"),
    ("heavy_vehicles", "Heavy-duty vehicles"),
    ("haulage_trucks", "Long-distance haulage trucks"),
]

class Command(BaseCommand):
    help = "Seed default vehicle categories if none exist"

    def handle(self, *args, **options):
        created = 0
        for name, description in DEFAULTS:
            obj, was_created = VehicleCategory.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'is_active': True,
                }
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Vehicle categories seeding complete. Created: {created}"))
