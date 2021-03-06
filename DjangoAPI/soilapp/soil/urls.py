from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('hourly', views.hourly, name='hourly'),
    path('daily', views.daily, name = 'daily'),
    path('widgetStatus', views.widgetStatus, name='widgetStatus'),
    path('systemStatus', views.systemStatus, name='systemStatus'),
    path('sensorStatus', views.sensorStatus, name='sensorStatus')

]
