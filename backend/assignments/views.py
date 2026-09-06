from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from enrollments.models import Enrollment
from enrollments.services import refresh_course_progress, refresh_enrollment_progress

from .models import Assignment, Submission
from .serializers import AssignmentSerializer, SubmissionSerializer

class AssignmentViewSet(viewsets.ModelViewSet):
    """Allow instructors to manage assignments for their own courses."""

    serializer_class = AssignmentSerializer

    def get_queryset(self):
        assignments = Assignment.objects.select_related('course', 'course__instructor')
        if self.request.user.is_staff:
            return assignments
        if self.request.user.is_authenticated and self.request.user.is_instructor:
            return assignments.filter(course__instructor=self.request.user)
        if self.request.user.is_authenticated:
            return assignments.filter(course__enrollments__student=self.request.user)
        return assignments.none()

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        if not self.request.user.is_staff and (
            not self.request.user.is_instructor or course.instructor != self.request.user
        ):
            raise PermissionDenied('Only the course instructor can create assignments.')
        assignment = serializer.save()
        refresh_course_progress(assignment.course)

    def perform_update(self, serializer):
        if not self.request.user.is_staff and serializer.instance.course.instructor != self.request.user:
            raise PermissionDenied('Only the course instructor can edit assignments.')
        assignment = serializer.save()
        refresh_course_progress(assignment.course)

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and instance.course.instructor != self.request.user:
            raise PermissionDenied('Only the course instructor can delete assignments.')
        course = instance.course
        instance.delete()
        refresh_course_progress(course)

class SubmissionViewSet(viewsets.ModelViewSet):
    """Let students submit work and instructors grade work for their courses."""

    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        submissions = Submission.objects.select_related('assignment', 'assignment__course', 'student')
        if self.request.user.is_staff:
            return submissions
        if self.request.user.is_instructor:
            return submissions.filter(assignment__course__instructor=self.request.user)
        return submissions.filter(student=self.request.user)

    def perform_create(self, serializer):
        assignment = serializer.validated_data['assignment']
        enrollment = Enrollment.objects.filter(student=self.request.user, course=assignment.course).first()
        if not enrollment:
            raise PermissionDenied('Enroll in the course before submitting a task.')
        serializer.save(student=self.request.user)
        refresh_enrollment_progress(enrollment)

    def perform_update(self, serializer):
        submission = serializer.instance
        if self.request.user.is_instructor and submission.assignment.course.instructor == self.request.user:
            serializer.save()
        elif submission.student == self.request.user and submission.score is None:
            serializer.save()
        else:
            raise PermissionDenied('You cannot update this submission.')
