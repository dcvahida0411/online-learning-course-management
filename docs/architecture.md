# Project 2 Architecture

## Roles

- Student: registers, browses published courses, enrolls, views lessons, and submits assignments.
- Instructor: creates and manages their courses, lessons, assignments, and grades submissions.
- Administrator: manages users and all platform data through Django admin.

## Backend modules

- `users`: custom user model, roles, registration, profile, JWT login.
- `courses`: course catalogue and instructor ownership.
- `enrollments`: student course participation and progress.
- `learning`: lessons, video links, and learning attachments.
- `assignments`: assignments, files, submissions, grading, and feedback.

## Application flow

```text
Instructor creates course → Student enrolls → Instructor adds lessons/tests
Student completes lessons → Student submits answer → Instructor grades + feedback
```

## API namespaces

- `/api/auth/` — registration, JWT login/refresh, and profile
- `/api/courses/`, `/api/enrollments/`, `/api/lessons/`
- `/api/assignments/`, `/api/submissions/`
