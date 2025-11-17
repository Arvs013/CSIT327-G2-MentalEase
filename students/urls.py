from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.student_dashboard, name='dashboard'),
    path('profile/', views.student_profile, name='profile_page'),
    path('about-us/', views.about_us, name='about_us'),
    path('journal-entries/', views.journal_entries, name='journal_entries'),
]
