from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from enrollments.models import Enrollment
from enrollments.services import refresh_course_progress, refresh_enrollment_progress

from .models import Lesson, LessonCompletion
from .serializers import LessonCompletionSerializer, LessonSerializer


class LessonViewSet(viewsets.ModelViewSet):
    """Expose lessons only to their course instructor or enrolled students."""

    serializer_class = LessonSerializer

    def get_queryset(self):
        lessons = Lesson.objects.select_related('course', 'course__instructor')
        if self.request.user.is_authenticated and self.request.user.is_instructor:
            return lessons.filter(course__instructor=self.request.user)
        if self.request.user.is_authenticated:
            return lessons.filter(course__enrollments__student=self.request.user, is_published=True)
        return lessons.none()

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        if not self.request.user.is_staff and (
            not self.request.user.is_instructor or course.instructor != self.request.user
        ):
            raise PermissionDenied('Only the course instructor can add lessons.')
        lesson = serializer.save()
        if lesson.is_published:
            refresh_course_progress(course)

    def perform_update(self, serializer):
        if not self.request.user.is_staff and serializer.instance.course.instructor != self.request.user:
            raise PermissionDenied('Only the course instructor can edit lessons.')
        lesson = serializer.save()
        refresh_course_progress(lesson.course)

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and instance.course.instructor != self.request.user:
            raise PermissionDenied('Only the course instructor can delete lessons.')
        course = instance.course
        instance.delete()
        refresh_course_progress(course)


class LessonCompletionViewSet(viewsets.ModelViewSet):
    """Record a student's completed lessons and update course progress."""

    serializer_class = LessonCompletionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LessonCompletion.objects.filter(student=self.request.user).select_related('lesson', 'lesson__course')

    def perform_create(self, serializer):
        lesson = serializer.validated_data['lesson']
        enrollment = Enrollment.objects.filter(student=self.request.user, course=lesson.course).first()
        if not enrollment:
            raise PermissionDenied('Enroll in the course before marking lessons complete.')
        serializer.save(student=self.request.user)
        refresh_enrollment_progress(enrollment)
