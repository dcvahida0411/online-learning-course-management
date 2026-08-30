from rest_framework.routers import DefaultRouter
from .views import LessonCompletionViewSet, LessonViewSet
router = DefaultRouter(); router.register('lessons', LessonViewSet, basename='lesson'); router.register('lesson-completions', LessonCompletionViewSet, basename='lesson-completion')
urlpatterns = router.urls
