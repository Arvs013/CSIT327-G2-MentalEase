from django.urls import path
from . import views

urlpatterns = [
    # Authentication URLs & Dashboard URLs
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.student_dashboard, name='dashboard'),
    path('profile/', views.student_profile, name='profile_page'),
    path('about-us/', views.about_us, name='about_us'),
    
    # Journal URLs
    path('dashboard/save_journal/', views.save_journal_entry, name='save_journal'),
    path('journal_entries/', views.journal_entries_view, name='journal_entries'),
    path('journal/<int:journal_id>/edit/', views.edit_journal_entry, name='edit_journal'),
    path('journal/<int:journal_id>/delete/', views.delete_journal_entry, name='delete_journal'),
    
    
    # Feed URLs
    path('feed/', views.feed_view, name='feed'),
    path('toggle-like/<int:post_id>/', views.toggle_like, name='toggle_like'),
    path('add-comment/<int:post_id>/', views.add_comment, name='add_comment'),
    path('post/<int:post_id>/edit/', views.edit_post, name='edit_post'),
    path('post/<int:post_id>/delete/', views.delete_post, name='delete_post'),

    #Resource URLs
     path('resources/', views.resources_hub, name='resources_hub'),
]
