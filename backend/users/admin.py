from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Give administrators a complete user and instructor management screen."""

    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    ordering = ('username',)

    fieldsets = UserAdmin.fieldsets + (
        ('Learning platform role', {'fields': ('role',)}),
        (
            'Profile details',
            {
                'fields': (
                    'avatar', 'bio', 'phone_number', 'gender', 'date_of_birth',
                    'current_city', 'current_state', 'work_experience',
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Learning platform role', {'fields': ('role',)}),
    )
