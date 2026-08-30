from django.contrib import admin
from .models import Course

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'code', 'instructor', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'code', 'description', 'instructor__username')
    list_select_related = ('instructor',)
