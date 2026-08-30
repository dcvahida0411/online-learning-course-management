from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from courses.models import Course
from .models import Assignment, Submission

class AssignmentPermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.student = User.objects.create_user(username='student', password='SafePassword123!')
        self.teacher = User.objects.create_user(username='teacher', password='SafePassword123!', role='instructor')
        self.course = Course.objects.create(title='Django', code='django', description='Course', instructor=self.teacher, status='published')

    def test_only_course_instructor_can_create_assignment(self):
        self.client.force_authenticate(self.student)
        denied = self.client.post('/api/assignments/', {'course': self.course.id, 'title': 'Task', 'instructions': 'Do it', 'due_date': '2026-12-01T10:00:00Z'}, format='json')
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.teacher)
        allowed = self.client.post('/api/assignments/', {'course': self.course.id, 'title': 'Task', 'instructions': 'Do it', 'due_date': '2026-12-01T10:00:00Z'}, format='json')
        self.assertEqual(allowed.status_code, 201)
        self.assertEqual(Assignment.objects.count(), 1)

    def test_assignment_due_date_must_be_in_future(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post('/api/assignments/', {'course': self.course.id, 'title': 'Old task', 'instructions': 'Do it', 'due_date': '2020-01-01T10:00:00Z'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('due_date', response.data)

    def test_submission_file_rejects_unsupported_extension(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from enrollments.models import Enrollment
        assignment = Assignment.objects.create(course=self.course, title='Task', instructions='Do it', due_date='2026-12-01T10:00:00Z')
        Enrollment.objects.create(student=self.student, course=self.course)
        self.client.force_authenticate(self.student)
        file = SimpleUploadedFile('unsafe.exe', b'not allowed')
        response = self.client.post('/api/submissions/', {'assignment': assignment.id, 'file': file}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('file', response.data)

    def test_only_instructor_can_grade_submission(self):
        from enrollments.models import Enrollment
        assignment = Assignment.objects.create(course=self.course, title='Task', instructions='Do it', due_date='2026-12-01T10:00:00Z')
        Enrollment.objects.create(student=self.student, course=self.course)
        submission = Submission.objects.create(assignment=assignment, student=self.student, content='My work')
        self.client.force_authenticate(self.student)
        denied = self.client.patch(f'/api/submissions/{submission.id}/', {'score': 90}, format='json')
        self.assertEqual(denied.status_code, 200)
        submission.refresh_from_db()
        self.assertIsNone(submission.score)
        self.client.force_authenticate(self.teacher)
        allowed = self.client.patch(f'/api/submissions/{submission.id}/', {'score': 90, 'feedback': 'Good work'}, format='json')
        self.assertEqual(allowed.status_code, 200)
        submission.refresh_from_db()
        self.assertEqual(submission.score, 90)
