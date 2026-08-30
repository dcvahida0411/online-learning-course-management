from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase

from .models import User

class AuthenticationTests(APITestCase):
    def test_student_can_register_and_login(self):
        registration = self.client.post('/api/auth/register/', {'username': 'newstudent', 'email': 'new@example.com', 'password': 'SafePassword123!'}, format='json')
        self.assertEqual(registration.status_code, 201)
        login = self.client.post('/api/auth/login/', {'username': 'newstudent', 'password': 'SafePassword123!'}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertIn('access', login.data)

    def test_user_can_reset_password_from_email_link(self):
        user = User.objects.create_user(
            username='resetstudent', email='reset@example.com', password='OldPassword123!'
        )
        response = self.client.post('/api/auth/password-reset/', {'email': user.email}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': urlsafe_base64_encode(force_bytes(user.pk)),
            'token': default_token_generator.make_token(user),
            'password': 'NewPassword123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.client.login(username='resetstudent', password='NewPassword123!'))
