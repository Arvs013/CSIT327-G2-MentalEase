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
from .models import Resource


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

    # map session -> local Django Student (get or create)
    def get_or_create_local_student(sess):
        email = sess.get('email')
        username = sess.get('username') or (email.split('@')[0] if email else None)
        full_name = sess.get('full_name') or username
        if not email and not username:
            return None
        student_obj, created = Student.objects.get_or_create(
            email=email,
            defaults={'username': username, 'full_name': full_name}
        )
        return student_obj

    local_student = get_or_create_local_student(student_session)

    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            new_post = form.save(commit=False)
            # assign local Student instance (not supabase id)
            new_post.student = local_student
            # enforce anonymous if no local_student found
            if local_student is None:
                new_post.is_anonymous = True
            new_post.save()

            messages.success(request, "Post created!")
            return redirect('feed')
        else:
            messages.error(request, "Post cannot be empty.")
    else:
        form = PostForm()

    posts = Post.objects.select_related('student').annotate(
        likes_count=Count('likes'),
        comments_count=Count('comments')
    ).order_by('-created_at')

    liked_post_ids = Like.objects.filter(student_id=local_student.id if local_student else None).values_list('post_id', flat=True)

    return render(request, 'students/feed.html', {
        'posts': posts,
        'student': student_session,
        'form': form,
        'liked_post_ids': set(liked_post_ids),
    })

def toggle_like(request, post_id):
    student_session = request.session.get('student')
    if not student_session:
        return redirect('login')

    # Get local Django Student
    local_student, _ = Student.objects.get_or_create(
        email=student_session['email'],
        defaults={
            'username': student_session.get('username') or student_session['email'].split('@')[0],
            'full_name': student_session.get('full_name') or student_session['username']
        }
    )

    post = get_object_or_404(Post, id=post_id)

    like = Like.objects.filter(post=post, student=local_student).first()

    if like:
        like.delete()
    else:
        Like.objects.create(post=post, student=local_student)

    return redirect('feed')



def add_comment(request, post_id):
    student = request.session.get('student')
    if not student:
        return redirect('login')

    # ensure local Django Student
    def get_local(sess):
        email = sess.get('email')
        username = sess.get('username') or (email.split('@')[0] if email else None)
        full_name = sess.get('full_name') or username
        if not email and not username:
            return None
        obj, _ = Student.objects.get_or_create(email=email, defaults={'username': username, 'full_name': full_name})
        return obj

    local_student = get_local(student)

    if request.method == "POST":
        content = request.POST.get("content", "").strip()
        if content and local_student:
            Comment.objects.create(
                post_id=post_id,
                content=content,
                student=local_student,
            )

    return redirect('feed')

def _get_session_student_id(request):
    student = request.session.get('student')
    return int(student.get('id')) if student and student.get('id') else None

def edit_post(request, post_id):
    # only allow POST (form from modal)
    if request.method != 'POST':
        return redirect('feed')

    from .models import Post  # local import to avoid circular issues
    post = get_object_or_404(Post, pk=post_id)

    session_student_id = _get_session_student_id(request)
    # allow only owner to edit
    if not post.student or post.student.id != session_student_id:
        messages.error(request, "You don't have permission to edit this post.")
        return redirect('feed')

    content = request.POST.get('content', '').strip()
    if not content:
        messages.error(request, "Post content cannot be empty.")
        return redirect('feed')

    post.content = content
    post.save()
    messages.success(request, "Post updated.")
    return redirect('feed')


def delete_post(request, post_id):
    if request.method != 'POST':
        return redirect('feed')

    from .models import Post
    post = get_object_or_404(Post, pk=post_id)

    session_student_id = _get_session_student_id(request)
    if not post.student or post.student.id != session_student_id:
        messages.error(request, "You don't have permission to delete this post.")
        return redirect('feed')

    post.delete()
    messages.success(request, "Post deleted.")
    return redirect('feed')

def resources_hub(request):
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '')

    resources = Resource.objects.all()

    if query:
        resources = resources.filter(title__icontains=query)

    if category:
        resources = resources.filter(category__icontains=category)

    return render(request, 'students/resources_hub.html', {
        'resources': resources,
        'query': query,
        'category': category,
    })