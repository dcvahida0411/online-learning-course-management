from django.shortcuts import render


def home(request):
    return render(request, 'home.html')


def login_page(request):
    return student_login_page(request)


def register_page(request):
    return student_register_page(request)


def forgot_password_page(request):
    return render(request, 'forgot_password.html')


def reset_password_page(request):
    return render(request, 'reset_password.html')


def student_login_page(request):
    return render(request, 'login.html', {'account_type': 'Student', 'expected_role': 'student'})


def student_register_page(request):
    return render(request, 'register.html')


def instructor_login_page(request):
    return render(request, 'login.html', {'account_type': 'Instructor', 'expected_role': 'instructor'})


def admin_login_page(request):
    return render(request, 'login.html', {'account_type': 'Administrator', 'expected_role': 'admin'})


def student_dashboard(request):
    return render(request, 'student_dashboard.html')


def instructor_dashboard(request):
    return render(request, 'instructor_dashboard.html')


def instructor_course_detail(request, course_id):
    return render(request, 'instructor_course_detail.html', {'course_id': course_id})


def admin_dashboard(request):
    return render(request, 'admin_dashboard.html')


def course_detail(request, course_id):
    return render(request, 'course_detail.html', {'course_id': course_id})


def profile_page(request):
    return render(request, 'profile.html')
