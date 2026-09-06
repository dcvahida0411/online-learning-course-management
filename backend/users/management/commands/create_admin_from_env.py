import os

from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Create the configured deployment administrator if it does not exist.'

    def handle(self, *args, **options):
        username = os.getenv('ADMIN_USERNAME')
        email = os.getenv('ADMIN_EMAIL', '')
        password = os.getenv('ADMIN_PASSWORD')

        if not username or not password:
            self.stdout.write('ADMIN_USERNAME and ADMIN_PASSWORD are not set; skipping admin creation.')
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            },
        )

        if created:
            user.set_password(password)
            user.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS(f'Created administrator {username}.'))
        else:
            self.stdout.write(f'Administrator {username} already exists; leaving its password unchanged.')