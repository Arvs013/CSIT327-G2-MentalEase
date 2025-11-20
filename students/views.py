from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth.hashers import make_password, check_password
from .forms import StudentSignUpForm, StudentLoginForm
from .supabase_client import supabase  # make sure you have supabase_client.py configured
from django.db.models import Count
from django.contrib.auth.decorators import login_required
from .models import Post, Like, Comment, Student
from .forms import PostForm 
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse


# 📝 Student Sign Up
def signup_view(request):
    if request.method == 'POST':
        form = StudentSignUpForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            full_name = form.cleaned_data['full_name']  # use full_name everywhere
            password = form.cleaned_data['password']

            hashed_password = make_password(password)

            data = {
                "username": username,
                "email": email,
                "full_name": full_name,  # use full_name
                "password": hashed_password
            }

            response = supabase.table("students").insert(data).execute()
            print(response)  # Add this line to see the response in your terminal

            if response.data:
                messages.success(request, "✅ Account created successfully! Please log in.")
                return redirect('login')
            else:
                messages.error(request, f"❌ Failed to register. {response.error}")
    else:
        form = StudentSignUpForm()
    return render(request, 'students/signup.html', {'form': form})


# Student Login
def login_view(request):
    if request.method == 'POST':
        form = StudentLoginForm(request.POST)  # Remove 'request, data='
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']

            response = supabase.table("students").select("*").eq("email", email).execute()
            if response.data:
                student = response.data[0]
                if check_password(password, student['password']):
                    request.session['student'] = {
                        'id': student['id'],
                        'username': student['username'],
                        'email': student['email']
                    }
                    messages.success(request, f"👋 Welcome back, {student['username']}!")
                    return redirect('dashboard')
            messages.error(request, "❌ Incorrect email or password.")
    else:
        form = StudentLoginForm()
    return render(request, 'students/login.html', {'form': form})


#Logout
def logout_view(request):
    if 'student' in request.session:
        del request.session['student']
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('login')


#Student Dashboard
def student_dashboard(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    return render(request, 'students/dashboard.html', {'student': student})

#Student Profile
def student_profile(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    return render(request, 'students/profile.html', {'student': student})

#About Us
def about_us(request):
    return render(request, 'students/about_us.html')

def journal_entries(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    # Fetch entries from your Supabase table (replace 'journal' with your table name)
    response = supabase.table('journals').select('*').eq('student_id', student['id']).execute()
    entries = response.data if response.data else []

    return render(request, 'students/journal_entries.html', {
        'student': student,
        'entries': entries
    })



def feed_view(request):
    student_session = request.session.get('student')
    if not student_session:
        messages.error(request, "Please login first.")
        return redirect('login')

    student_id = student_session['id']  

    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            Post.objects.create(
                content=form.cleaned_data['content'],
                is_anonymous=form.cleaned_data['is_anonymous'],
                student_id=student_id
            )
            messages.success(request, "Post created!")
            return redirect('feed')
        else:
            messages.error(request, "Post cannot be empty.")
            return redirect('feed')

    # GET request: show all posts
    posts = Post.objects.all().order_by('-created_at')
    return render(request, 'students/feed.html', {
        'posts': posts,
        'student': student_session,
        'form': PostForm()
    })

    # GET request
    posts = Post.objects.all().order_by('-created_at')
    form = PostForm()
    return render(request, 'students/feed.html', {
        'posts': posts,
        'student': student_session,
        'form': form
    })

def toggle_like(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    like, created = Like.objects.get_or_create(post=post, student=request.user)
    
    if not created:
        # If it already existed, delete it (unlike)
        like.delete()
    
    # Redirect back to the feed page
    return redirect('feed')


def add_comment(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        content = request.POST.get('content', '').strip()
        if content:
            Comment.objects.create(
                post=post,
                student=request.user,
                content=content
            )
    # Redirect back to the feed page
    return redirect('feed')