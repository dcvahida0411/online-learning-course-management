import logging

from django.conf import settings
from django.core.mail import send_mail
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
