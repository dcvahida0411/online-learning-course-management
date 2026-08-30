from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from courses.models import Course
from .models import Enrollment

class EnrollmentTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.student = User.objects.create_user(username='student', password='SafePassword123!')
        teacher = User.objects.create_user(username='teacher', password='SafePassword123!', role='instructor')
        self.course = Course.objects.create(title='Django', code='django', description='Course', instructor=teacher, status='published')
        self.client.force_authenticate(self.student)

    def test_student_can_enroll_once(self):
        response = self.client.post('/api/enrollments/', {'course': self.course.id}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Enrollment.objects.count(), 1)
        duplicate = self.client.post('/api/enrollments/', {'course': self.course.id}, format='json')
        self.assertEqual(duplicate.status_code, 400)
