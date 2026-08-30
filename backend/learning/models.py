from django.conf import settings
from django.db import models

from courses.models import Course


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    attachment = models.FileField(upload_to='lessons/', blank=True, null=True)
    position = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=False)
    class Meta:
        ordering = ['position']
        constraints = [
            models.UniqueConstraint(
                fields=['course', 'position'],
                name='unique_lesson_position',
            )
        ]

    def __str__(self):
        return self.title


class LessonCompletion(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='completions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_completions')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['lesson', 'student'], name='unique_lesson_completion')]

    def __str__(self):
        return f'{self.student} completed {self.lesson}'
