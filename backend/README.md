# LearnSpace Backend

Online Learning and Course Management System built with Django and Django REST Framework.

## Features

- JWT registration, login, refresh, and profile API.
- Student, instructor, and administrator roles.
- Courses, enrollments, lessons, progress tracking, assignments, test links, submissions, grading, and feedback.
- Duplicate enrollment prevention, due-date validation, file validation, search, ordering, pagination, and Django Admin.

## Run with PostgreSQL (required)

From `backend`:

```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Copy `.env.example` to `.env`, set a secure PostgreSQL password, create the PostgreSQL database, then run:

```powershell
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## Browser pages

| Page | URL |
| --- | --- |
| Course catalogue | `/` |
| Student registration | `/student/register/` |
| Student login | `/student/login/` |
| Instructor login | `/instructor/login/` |
| Administrator login | `/administrator/login/` |
| Student dashboard | `/dashboard/student/` |
| Instructor dashboard | `/dashboard/instructor/` |
| LearnSpace admin dashboard | `/dashboard/admin/` |
| Django admin data management | `/admin/` |
| Student course page | `/courses/<id>/` |
| Instructor course management | `/instructor/courses/<id>/` |

## REST API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register/` | Register a student |
| `POST /api/auth/login/` | Obtain JWT tokens |
| `POST /api/auth/refresh/` | Refresh the access token |
| `GET/PATCH /api/auth/profile/` | Current user profile |
| `/api/courses/` | Courses |
| `/api/enrollments/` | Student enrollments/progress |
| `/api/lessons/` | Lessons |
| `/api/lesson-completions/` | Mark lesson complete |
| `/api/assignments/` | Assignments/test links |
| `/api/submissions/` | Student submissions and grading |

Use `Authorization: Bearer <access-token>` for protected requests.

## Roles and access control

- **Student:** Registers, browses published courses, enrolls, completes classes, submits tasks, and views their own progress and scores.
- **Instructor:** Creates and edits only their own courses, classes, and tasks; views and grades submissions for their courses.
- **Administrator:** Uses the LearnSpace admin dashboard for platform data and Django Admin for full data management.

## Registration welcome email (SMTP)

Welcome emails are sent after successful student registration. Add SMTP values to the local `.env` file; never commit that file.

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=LearnSpace <your-email@example.com>
```

For Gmail, use a Google App Password rather than the normal account password.

The password recovery flow is available at `/forgot-password/`. It emails a one-time reset link and uses Django's password-reset token validation.

## Testing

```powershell
..\.venv\Scripts\python.exe manage.py test
```

## Database

PostgreSQL is the configured project database, as required by the Project 2 brief. SQLite is retained only when `DB_ENGINE=sqlite` is explicitly set for isolated automated tests.

## Docker with PostgreSQL

From the repository root, change the placeholder secrets in `docker-compose.yml`, then run:

```powershell
docker compose up --build
```

The backend will be available at `http://127.0.0.1:8000/`.

## Production notes

- Set `DJANGO_DEBUG=false` and use a strong `DJANGO_SECRET_KEY`.
- Replace all placeholder database and Docker secrets.
- Run `python manage.py collectstatic` before production deployment.
- Run the project with Gunicorn behind Nginx. A starter configuration is available in [`docs/nginx.conf.example`](../docs/nginx.conf.example).
