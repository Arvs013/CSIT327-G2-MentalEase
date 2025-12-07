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

    # Feed URLs
    path('feed/', views.feed_view, name='feed'),
    path('toggle-like/<int:post_id>/', views.toggle_like, name='toggle_like'),
    path('add-comment/<int:post_id>/', views.add_comment, name='add_comment'),
    path('post/<int:post_id>/edit/', views.edit_post, name='edit_post'),
    path('post/<int:post_id>/delete/', views.delete_post, name='delete_post'),

    #Resource URLs
     path('resources/', views.resources_hub, name='resources_hub'),
]
