from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import Student
from .models import Post

# Sign-up form
class StudentSignUpForm(forms.Form):
    ACCOUNT_TYPE_CHOICES = [
        ('user', 'Regular User'),
        ('admin', 'Admin'),
    ]
    
    username = forms.CharField(max_length=100)
    full_name = forms.CharField(max_length=100)
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput, min_length=6)
    confirm_password = forms.CharField(widget=forms.PasswordInput, min_length=6)
    account_type = forms.ChoiceField(
        choices=ACCOUNT_TYPE_CHOICES,
        initial='user',
        widget=forms.RadioSelect,
        required=True,
        label="Account Type"
    )
    
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        
        if password and confirm_password:
            if password != confirm_password:
                raise forms.ValidationError("Passwords do not match. Please try again.")
        return cleaned_data

# Login form
class StudentLoginForm(forms.Form):
    username = forms.CharField(label="Username", max_length=100)
    password = forms.CharField(widget=forms.PasswordInput)

class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['content', 'is_anonymous']
        widgets = {
            'content': forms.Textarea(attrs={'placeholder': 'Share your thoughts...'}),
        }

# Admin Registration form
class AdminRegistrationForm(forms.Form):
    username = forms.CharField(max_length=100)
    full_name = forms.CharField(max_length=100)
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)