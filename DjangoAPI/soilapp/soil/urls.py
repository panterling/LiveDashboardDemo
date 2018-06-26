from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('hourly', views.hourly, name='hourly'),
    path('daily', views.daily, name = 'daily'),
    path('status', views.status, name='status'),
]
