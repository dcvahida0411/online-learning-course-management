from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from courses.models import Course
from enrollments.models import Enrollment
from .models import Lesson

class LessonCompletionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.student = User.objects.create_user(username='student', password='SafePassword123!')
        teacher = User.objects.create_user(username='teacher', password='SafePassword123!', role='instructor')
        course = Course.objects.create(title='Django', code='django', description='Course', instructor=teacher, status='published')
        self.lesson = Lesson.objects.create(course=course, title='Lesson 1', position=1, is_published=True)
        Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)

    def test_lesson_completion_updates_enrollment_progress(self):
        response = self.client.post('/api/lesson-completions/', {'lesson': self.lesson.id}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Enrollment.objects.get(student=self.student).progress, 100)
