from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.student_dashboard, name='dashboard'),
    path('profile/', views.student_profile, name='profile_page'),
    path('profile/edit/', views.profile_edit, name='profile_edit'),
    path('api/update-profile/', views.update_profile, name='update_profile'),
    path('api/change-password/', views.change_password, name='change_password'),
    path('about-us/', views.about_us, name='about_us'),
    path('journal-entries/', views.journal_entries, name='journal_entries'),
    
    # Journal API URLs
    path('api/journals/', views.get_journals, name='api_get_journals'),
    path('api/journals/create/', views.create_journal, name='api_create_journal'),
    path('api/journals/<int:journal_id>/update/', views.update_journal, name='api_update_journal'),
    path('api/journals/<int:journal_id>/delete/', views.delete_journal, name='api_delete_journal'),

    # Feed URLs
    path('feed/', views.feed_view, name='feed'),
    path('api/posts/', views.get_anonymous_posts, name='api_get_posts'),
    path('api/posts/create/', views.create_anonymous_post, name='api_create_post'),
    path('api/posts/<str:post_id>/like/', views.like_post, name='api_like_post'),
    path('api/posts/<str:post_id>/likes/', views.get_likes, name='api_get_likes'),
    path('api/posts/<str:post_id>/comments/', views.get_comments, name='api_get_comments'),
    path('api/posts/<str:post_id>/comments/create/', views.create_comment, name='api_create_comment'),
    path('toggle-like/<int:post_id>/', views.toggle_like, name='toggle_like'),
    path('add-comment/<int:post_id>/', views.add_comment, name='add_comment'),
    path('post/<int:post_id>/edit/', views.edit_post, name='edit_post'),
    path('post/<int:post_id>/delete/', views.delete_post, name='delete_post'),

    #Resource URLs
     path('resources/', views.resources_hub, name='resources_hub'),
    
    # Admin URLs
    path('admin/posts/', views.admin_posts_view, name='admin_posts'),
    path('admin/users/', views.admin_users_view, name='admin_users'),
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/resources/', views.admin_resources_view, name='admin_resources'),
    
    # Admin API URLs
    path('api/admin/posts/', views.admin_get_posts, name='admin_get_posts'),
    path('api/admin/posts/<int:post_id>/approve/', views.admin_approve_post, name='admin_approve_post'),
    path('api/admin/posts/<int:post_id>/decline/', views.admin_decline_post, name='admin_decline_post'),
    path('api/admin/posts/<int:post_id>/pending/', views.admin_pending_post, name='admin_pending_post'),
    path('api/admin/posts/<int:post_id>/delete/', views.admin_delete_post, name='admin_delete_post'),
    path('api/admin/users/', views.admin_get_users, name='admin_get_users'),
    path('api/admin/users/<int:user_id>/delete/', views.admin_delete_user, name='admin_delete_user'),
    
    # Utility URL for manually adding admin (temporary - remove after fixing admin accounts)
    path('add-admin-utility/', views.add_admin_utility, name='add_admin_utility'),
]
