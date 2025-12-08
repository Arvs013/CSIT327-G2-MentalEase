from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth.hashers import make_password, check_password
from .forms import StudentSignUpForm, StudentLoginForm
from .supabase_client import supabase  # make sure you have supabase_client.py configured
from django.db.models import Count
from django.contrib.auth.decorators import login_required
from .models import Post, Like, Comment, Student, Journal, Resource
from .forms import PostForm 
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
import json


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

def create_journal(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            student_id = data.get('student_id')
            title = data.get('title', 'Reflective Journal')
            content = data.get('content')

            if not content:
                return JsonResponse({'success': False, 'error': 'Content is required.'})

            journal = Journal.objects.create(
                student_id_id=student_id,  # if ForeignKey
                title=title,
                content=content
            )
            return JsonResponse({'success': True, 'entry': {'id': journal.id, 'title': journal.title, 'content': journal.content}})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method.'})

def save_journal_entry(request):
    if request.method == 'POST':
        student_session = request.session.get('student')
        if not student_session:
            return JsonResponse({'success': False, 'error': 'Not logged in'}, status=401)

        # Get or create local Django Student from session
        email = student_session.get('email')
        username = student_session.get('username') or (email.split('@')[0] if email else None)
        full_name = student_session.get('full_name') or username

        try:
            student_obj, _ = Student.objects.get_or_create(
                email=email,
                defaults={'username': username, 'full_name': full_name}
            )
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

        try:
            data = json.loads(request.body)
            content = data.get('content', '').strip()
            title = data.get('title', 'Reflective Journal').strip() or 'Reflective Journal'

            if not content:
                return JsonResponse({'success': False, 'error': 'Content cannot be empty'}, status=400)

            journal = Journal.objects.create(
                student_id=student_obj,
                title=title,
                content=content
            )

            return JsonResponse({
                'success': True,
                'id': journal.id,
                'title': journal.title,
                'content': journal.content,
                'created_at': journal.created_at.isoformat()
            })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)


def journal_entries_view(request):
    student_session = request.session.get('student')
    if not student_session:
        return redirect('login')

    email = student_session.get('email')
    if not email:
        messages.error(request, "Invalid session.")
        return redirect('login')

    try:
        student_obj = Student.objects.get(email=email)
    except Student.DoesNotExist:
        messages.error(request, "Student not found.")
        return redirect('login')

    journals_qs = Journal.objects.filter(student_id=student_obj).order_by('-created_at')

    # Convert to list of dicts
    journals_data = [
        {
            'id': j.id,
            'title': j.title or 'Journal Entry',
            'content': j.content,
            'created_at': j.created_at.isoformat() if j.created_at else ''
        }
        for j in journals_qs
    ]

    print(f"DEBUG: journals_data = {journals_data}")

    context = {
        'student': student_session,
        'journals': json.dumps(journals_data),  # Must be JSON string
    }
    return render(request, 'students/journal_entries.html', context)


def edit_journal_entry(request, journal_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'}, status=400)

    student_session = request.session.get('student')
    if not student_session:
        return JsonResponse({'success': False, 'error': 'Not logged in'}, status=401)

    try:
        email = student_session.get('email')
        student_obj = Student.objects.get(email=email)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Student not found'}, status=404)

    journal = get_object_or_404(Journal, id=journal_id)
    if journal.student_id != student_obj:
        return JsonResponse({'success': False, 'error': 'Not authorized'}, status=403)

    try:
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        content = (data.get('content') or '').strip()
        if not content:
            return JsonResponse({'success': False, 'error': 'Content cannot be empty'})
        journal.content = content
        if title != '':
            journal.title = title
        journal.save()
        return JsonResponse({'success': True, 'id': journal.id, 'title': journal.title, 'content': journal.content})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def delete_journal_entry(request, journal_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request'}, status=400)

    student_session = request.session.get('student')
    if not student_session:
        return JsonResponse({'error': 'Not logged in'}, status=401)

    try:
        email = student_session.get('email')
        student_obj = Student.objects.get(email=email)
    except Student.DoesNotExist:
        return JsonResponse({'error': 'Student not found'}, status=404)

    journal = get_object_or_404(Journal, id=journal_id)

    if journal.student_id != student_obj:
        return JsonResponse({'error': 'Not authorized'}, status=403)

    journal.delete()
    return JsonResponse({'success': True})