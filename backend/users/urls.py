from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    AdminOverviewView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', TokenObtainPairView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/profile/', ProfileView.as_view()),
    path('auth/password-reset/', PasswordResetRequestView.as_view()),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view()),
    path('admin/overview/', AdminOverviewView.as_view()),
]
