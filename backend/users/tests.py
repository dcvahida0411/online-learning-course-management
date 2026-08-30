from rest_framework.test import APITestCase

class AuthenticationTests(APITestCase):
    def test_student_can_register_and_login(self):
        registration = self.client.post('/api/auth/register/', {'username': 'newstudent', 'email': 'new@example.com', 'password': 'SafePassword123!'}, format='json')
        self.assertEqual(registration.status_code, 201)
        login = self.client.post('/api/auth/login/', {'username': 'newstudent', 'password': 'SafePassword123!'}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertIn('access', login.data)
