from pathlib import Path
from rest_framework import serializers

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_UPLOAD_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.zip'}


def validate_upload_file(uploaded_file):
    if uploaded_file.size > MAX_UPLOAD_SIZE:
        raise serializers.ValidationError('File size must not exceed 5 MB.')
    extension = Path(uploaded_file.name).suffix.lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
        raise serializers.ValidationError(f'Unsupported file type. Allowed types: {allowed}.')
    return uploaded_file
