from django.contrib import admin
from .models import Lesson, LessonCompletion

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'position', 'is_published')
    list_filter = ('is_published', 'course')
    search_fields = ('title', 'content', 'course__title')
    ordering = ('course', 'position')

@admin.register(LessonCompletion)
class LessonCompletionAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'student', 'completed_at')
    list_select_related = ('lesson', 'student')
