from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import Student
from .models import Post

# Sign-up form
class StudentSignUpForm(forms.Form):
    username = forms.CharField(max_length=100)
    full_name = forms.CharField(max_length=100)
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)

# Login form
class StudentLoginForm(forms.Form):
    email = forms.EmailField(label="Email")
    password = forms.CharField(widget=forms.PasswordInput)

class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['content', 'is_anonymous']
        widgets = {
            'content': forms.Textarea(attrs={'placeholder': 'Share your thoughts...'}),
        }