from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import Course

class CoursePermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.student = User.objects.create_user(username='student', password='SafePassword123!')
        self.instructor = User.objects.create_user(username='teacher', password='SafePassword123!', role='instructor')

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/courses/', {'title': 'Blocked', 'code': 'blocked', 'description': 'Test', 'status': 'published'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_instructor_can_create_course(self):
        self.client.force_authenticate(self.instructor)
        response = self.client.post('/api/courses/', {'title': 'Allowed', 'code': 'allowed', 'description': 'Test', 'status': 'published'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Course.objects.count(), 1)

    def test_other_instructor_cannot_edit_course(self):
        course = Course.objects.create(title='Private', code='private', description='Test', instructor=self.instructor, status='published')
        User = get_user_model()
        other = User.objects.create_user(username='other', password='SafePassword123!', role='instructor')
        self.client.force_authenticate(other)
        response = self.client.patch(f'/api/courses/{course.id}/', {'title': 'Changed'}, format='json')
        self.assertEqual(response.status_code, 403)
