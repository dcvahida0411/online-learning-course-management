from django.urls import path
from . import web_views

urlpatterns = [
    path('', web_views.home, name='home'),
    path('login/', web_views.login_page, name='login'),
    path('register/', web_views.register_page, name='register'),
    path('forgot-password/', web_views.forgot_password_page, name='forgot-password'),
    path('reset-password/', web_views.reset_password_page, name='reset-password'),
    path('student/login/', web_views.student_login_page, name='student-login'),
    path('student/register/', web_views.student_register_page, name='student-register'),
    path('instructor/login/', web_views.instructor_login_page, name='instructor-login'),
    # `/admin/` is Django's built-in management site, so this uses its own prefix.
    path('administrator/login/', web_views.admin_login_page, name='admin-login'),
    path('dashboard/student/', web_views.student_dashboard, name='student-dashboard'),
    path('dashboard/instructor/', web_views.instructor_dashboard, name='instructor-dashboard'),
    path('instructor/courses/<int:course_id>/', web_views.instructor_course_detail, name='instructor-course-detail'),
    path('dashboard/admin/', web_views.admin_dashboard, name='admin-dashboard'),
    path('courses/<int:course_id>/', web_views.course_detail, name='course-detail'),
    path('profile/', web_views.profile_page, name='profile'),
]
