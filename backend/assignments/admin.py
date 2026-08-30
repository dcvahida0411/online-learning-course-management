from django.contrib import admin
from .models import Assignment, Submission

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'due_date', 'max_marks')
    list_filter = ('course', 'due_date')
    search_fields = ('title', 'instructions', 'course__title')

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'student', 'score', 'submitted_at')
    list_filter = ('assignment__course',)
    search_fields = ('assignment__title', 'student__username', 'content')
    list_select_related = ('assignment', 'student')
