from django.utils import timezone
from rest_framework import serializers

from config.validators import validate_upload_file
from .models import Assignment, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = '__all__'

    def validate_due_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('Due date must be in the future.')
        return value


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'
        read_only_fields = ('student', 'submitted_at')

    def get_fields(self):
        fields = super().get_fields()
        user = self.context['request'].user
        if not user.is_authenticated or not user.is_instructor:
            fields['score'].read_only = True
            fields['feedback'].read_only = True
        return fields

    def validate_score(self, value):
        assignment = self.instance.assignment if self.instance else None
        if assignment and value > assignment.max_marks:
            raise serializers.ValidationError(f'Score cannot exceed {assignment.max_marks}.')
        return value

    def validate_file(self, value):
        return validate_upload_file(value) if value else value

    def validate(self, attrs):
        assignment = attrs.get('assignment', getattr(self.instance, 'assignment', None))
        user = self.context['request'].user
        if assignment and not self.instance and Submission.objects.filter(assignment=assignment, student=user).exists():
            raise serializers.ValidationError('You have already submitted this assignment.')
        return attrs
