"""Progress calculations shared by lessons and assignments."""

from assignments.models import Assignment, Submission
from learning.models import Lesson, LessonCompletion

from .models import Enrollment


def refresh_enrollment_progress(enrollment):
    """Calculate one student's course progress from completed learning items."""
    course = enrollment.course
    total_lessons = Lesson.objects.filter(course=course, is_published=True).count()
    total_tasks = Assignment.objects.filter(course=course).count()
    completed_lessons = LessonCompletion.objects.filter(
        student=enrollment.student,
        lesson__course=course,
        lesson__is_published=True,
    ).count()
    submitted_tasks = Submission.objects.filter(
        student=enrollment.student,
        assignment__course=course,
    ).count()
    total_items = total_lessons + total_tasks
    completed_items = completed_lessons + submitted_tasks
    enrollment.progress = round((completed_items / total_items) * 100) if total_items else 0
    enrollment.status = (
        Enrollment.Status.COMPLETED
        if total_items and completed_items >= total_items
        else Enrollment.Status.ACTIVE
    )
    enrollment.save(update_fields=['progress', 'status'])
    return enrollment.progress


def refresh_course_progress(course):
    """Refresh progress for all students enrolled in a course."""
    for enrollment in Enrollment.objects.filter(course=course).select_related('course', 'student'):
        refresh_enrollment_progress(enrollment)
