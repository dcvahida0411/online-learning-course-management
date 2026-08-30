from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Course
from .serializers import CourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    """Manage courses while restricting write actions to the course owner."""

    serializer_class = CourseSerializer
    search_fields = ('title', 'code', 'description')
    ordering_fields = ('title', 'created_at')

    def get_queryset(self):
        courses = Course.objects.select_related('instructor')
        if self.request.user.is_authenticated and self.request.user.is_instructor:
            return courses
        return courses.filter(status=Course.Status.PUBLISHED)

    def perform_create(self, serializer):
        if not self.request.user.is_instructor:
            raise PermissionDenied('Only instructors can create courses.')
        serializer.save(instructor=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.instructor != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('You do not own this course.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.instructor != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('You do not own this course.')
        instance.delete()
