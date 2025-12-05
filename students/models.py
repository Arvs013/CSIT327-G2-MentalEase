from django.contrib.auth.models import AbstractUser, Group, Permission
from django.conf import settings
from django.db import models

class Student(AbstractUser):
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    
    def __str__(self):
        return self.username

    groups = models.ManyToManyField(
        Group,
        related_name='student_users',  # Unique related_name to avoid clashes
        blank=True,
        verbose_name='groups',
        help_text='The groups this user belongs to.'
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name='student_users',  # Unique related_name to vavoid clashes
        blank=True,
        verbose_name='user permissions',
        help_text='Specific permissions for this user.'
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # still needed by Django but login uses email

class Post(models.Model):
    content = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        unique_together = ('post', 'student')