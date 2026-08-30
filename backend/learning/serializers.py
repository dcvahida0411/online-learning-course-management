from rest_framework import serializers
from .models import Lesson, LessonCompletion
from config.validators import validate_upload_file

class LessonSerializer(serializers.ModelSerializer):
    class Meta: model = Lesson; fields = '__all__'

    def validate_attachment(self, value):
        return validate_upload_file(value) if value else value


class LessonCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonCompletion
        fields = ('id', 'lesson', 'student', 'completed_at')
        read_only_fields = ('student', 'completed_at')
