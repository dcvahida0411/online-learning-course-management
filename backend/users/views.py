import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import RegisterSerializer, UserSerializer
from assignments.models import Assignment, Submission
from courses.models import Course

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """Register a new student account."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        name = user.first_name or user.username
        try:
            send_mail(
                subject='Welcome to LearnSpace',
                message=(
                    f'Hello {name},\n\n'
                    'You have successfully registered with LearnSpace. '
                    'You can now log in, explore courses, and begin learning.\n\n'
                    'Welcome to LearnSpace!'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            # Registration must not fail just because the mail server is unavailable.
            logger.exception('Welcome email could not be sent for user %s.', user.username)


class PasswordResetRequestView(APIView):
    """Email a one-time password reset link without exposing account existence."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = request.build_absolute_uri(f'/reset-password/?uid={uid}&token={token}')
            try:
                send_mail(
                    subject='Reset your LearnSpace password',
                    message=(
                        f'Hello {user.first_name or user.username},\n\n'
                        'We received a request to reset your LearnSpace password.\n\n'
                        f'Reset your password: {reset_url}\n\n'
                        'If you did not request this, you can safely ignore this email.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('Password reset email could not be sent for user %s.', user.username)
        return Response({'detail': 'If an account exists for this email, a password reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """Validate a reset token and store a new password."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        password = request.data.get('password', '')
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.filter(pk=user_id, is_active=True).first()
        except (TypeError, ValueError, OverflowError, ValidationError):
            return Response({'detail': 'This password reset link is invalid.'}, status=400)
        if not user:
            return Response({'detail': 'This password reset link is invalid.'}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This password reset link is invalid or has expired.'}, status=400)
        try:
            validate_password(password, user=user)
        except ValidationError as error:
            return Response({'password': list(error.messages)}, status=400)
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully. You can now log in.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """Return and update the authenticated user's own profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AdminOverviewView(APIView):
    """Return safe platform summary data for the custom administrator dashboard."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.order_by('username')
        user_rows = [
            {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': 'Administrator' if user.is_staff else user.get_role_display(),
                'active': user.is_active,
            }
            for user in users[:20]
        ]
        return Response({
            'counts': {
                'users': users.count(),
                'students': users.filter(role=User.Role.STUDENT).count(),
                'instructors': users.filter(role=User.Role.INSTRUCTOR).count(),
                'courses': Course.objects.count(),
                'assignments': Assignment.objects.count(),
                'submissions': Submission.objects.count(),
            },
            'users': user_rows,
        })
