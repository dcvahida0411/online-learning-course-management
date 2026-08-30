from rest_framework import serializers

from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ('student',)

    def validate_course(self, course):
        if course.status != 'published':
            raise serializers.ValidationError('Only published courses can be enrolled in.')
        if Enrollment.objects.filter(student=self.context['request'].user, course=course).exists():
            raise serializers.ValidationError('You are already enrolled.')
        return course
