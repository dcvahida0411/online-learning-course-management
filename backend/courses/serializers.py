from rest_framework import serializers

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    """Include public instructor details for course cards and course pages."""

    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    instructor_full_name = serializers.SerializerMethodField(read_only=True)
    instructor_avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ('instructor',)

    def get_instructor_full_name(self, course):
        full_name = course.instructor.get_full_name().strip()
        return full_name or course.instructor.username

    def get_instructor_avatar_url(self, course):
        avatar = course.instructor.avatar
        if not avatar:
            return None

        request = self.context.get('request')
        return request.build_absolute_uri(avatar.url) if request else avatar.url
