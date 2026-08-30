from django.contrib.auth.password_validation import validate_password
from pathlib import Path
from rest_framework import serializers
import re

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the logged-in user's editable profile."""

    is_instructor = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'bio',
            'avatar', 'avatar_url', 'phone_number', 'gender', 'date_of_birth',
            'current_city', 'current_state', 'work_experience', 'is_instructor', 'is_staff',
        )
        read_only_fields = ('username', 'role')

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url

    def validate_avatar(self, value):
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('Profile photo must not exceed 2 MB.')
        if Path(value.name).suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
            raise serializers.ValidationError('Use JPG, PNG, or WEBP for a profile photo.')
        return value


class RegisterSerializer(serializers.ModelSerializer):
    """Create a student account using Django's password hashing."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ('username', 'password', 'first_name', 'last_name', 'email')

    def validate_first_name(self, value):
        return self._validate_name(value, 'First name')

    def validate_last_name(self, value):
        return self._validate_name(value, 'Last name')

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email address already exists.')
        return email

    @staticmethod
    def _validate_name(value, field_name):
        value = value.strip()
        if value and not re.fullmatch(r"[A-Za-z][A-Za-z .'-]*", value):
            raise serializers.ValidationError(
                f'{field_name} can contain letters, spaces, hyphens, apostrophes, and periods only.'
            )
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
