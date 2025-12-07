from django.contrib import admin
from .models import Post, Student, Comment, Like, Resource

# Admin for Post
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'student_info', 'content', 'is_anonymous', 'approved', 'created_at')
    list_filter = ('is_anonymous', 'approved', 'created_at')
    search_fields = ('content', 'student__username', 'student__email')
    actions = ['approve_posts', 'reject_posts']

    # Custom method to display student info even for anonymous posts
    def student_info(self, obj):
        if obj.is_anonymous:
            if obj.student:
                return f"{obj.student.username} (ID: {obj.student.id})"
            return "Anonymous (No student)"
        return obj.student.username if obj.student else "Unknown"
    student_info.short_description = 'Student'

    # Custom actions
    def approve_posts(self, request, queryset):
        queryset.update(approved=True)
        self.message_user(request, f"{queryset.count()} post(s) approved.")

    def reject_posts(self, request, queryset):
        queryset.update(approved=False)
        self.message_user(request, f"{queryset.count()} post(s) rejected.")

# Add an approved field to Post if it doesn't exist
if not hasattr(Post, 'approved'):
    from django.db import models
    Post.add_to_class('approved', models.BooleanField(default=False))

# Register models
admin.site.register(Post, PostAdmin)
admin.site.register(Student)
admin.site.register(Comment)
admin.site.register(Like)

class ResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'created_at')
    search_fields = ('title', 'category')
    list_filter = ('category',)

admin.site.register(Resource, ResourceAdmin)