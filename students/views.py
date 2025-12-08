from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth.hashers import make_password, check_password
from .forms import StudentSignUpForm, StudentLoginForm, AdminRegistrationForm
from .supabase_client import supabase  # make sure you have supabase_client.py configured
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from httpx import ConnectError
from django.http import JsonResponse
from django.views.generic import UpdateView
from django.db.models import Q, Count
from django.utils import timezone
import json
from datetime import datetime
import os
import base64
from io import BytesIO
try:
    import pytz
except ImportError:
    pytz = None
try:
    from dateutil import parser as date_parser
except ImportError:
    date_parser = None

# Optional PIL import for image processing
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None


# Home Page
def home_view(request):
    return render(request, 'students/home.html')

# About Us Page
def about_us(request):
    # Check if user is logged in to pass student data to template
    student = request.session.get('student', None)
    return render(request, 'students/about_us.html', {'student': student})

# Journal Entries Page
def journal_entries(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    return render(request, 'students/journal_entries.html', {'student': student})

# Resources Hub Page
def resources_hub(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    return render(request, 'students/resources_hub.html', {'student': student})

# 📝 Student Sign Up
def signup_view(request):
    if request.method == 'POST':
        form = StudentSignUpForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            full_name = form.cleaned_data['full_name']  # use full_name everywhere
            password = form.cleaned_data['password']
            confirm_password = form.cleaned_data.get('confirm_password', '')
            account_type = form.cleaned_data.get('account_type', 'user')
            
            # Additional password verification (form validation already checks this, but double-check)
            if password != confirm_password:
                messages.error(request, "❌ Passwords do not match. Please try again.")
                return render(request, 'students/signup.html', {'form': form})

            hashed_password = make_password(password)

            data = {
                "username": username,
                "email": email,
                "full_name": full_name,  # use full_name
                "password": hashed_password,
                "created_at": datetime.now().isoformat()  # Add created_at timestamp for Member Since
            }

            try:
                # Check if username already exists
                try:
                    username_check = supabase.table("students").select("username").eq("username", username).execute()
                    if username_check.data and len(username_check.data) > 0:
                        messages.error(request, "❌ Username is already taken. Please choose a different one.")
                        return render(request, 'students/signup.html', {'form': form})
                except Exception as check_error:
                    print(f"Error checking username: {check_error}")
                    # Continue with registration attempt, Supabase will handle duplicate key errors
                
                # Check if email already exists
                try:
                    email_check = supabase.table("students").select("email").eq("email", email).execute()
                    if email_check.data and len(email_check.data) > 0:
                        messages.error(request, "❌ Email is already taken. Please use a different email address.")
                        return render(request, 'students/signup.html', {'form': form})
                except Exception as check_error:
                    print(f"Error checking email: {check_error}")
                    # Continue with registration attempt, Supabase will handle duplicate key errors

                response = supabase.table("students").insert(data).execute()
                print(f"Insert response: {response}")  # Debug output

                if response.data:
                    student_id = response.data[0]['id']
                    
                    # If admin account, add to admins table
                    if account_type == 'admin':
                        admin_added = False
                        try:
                            # Try to insert into admins table (created_at may not exist)
                            admin_data = {"student_id": student_id}
                            result = supabase.table("admins").insert(admin_data).execute()
                            if result.data:
                                admin_added = True
                                print(f"Admin account created successfully for student_id: {student_id}")
                        except Exception as admin_error:
                            error_msg = str(admin_error)
                            print(f"Error adding to admins table (first attempt): {error_msg}")
                            
                            # Try alternative: Update students table with is_admin flag if column exists
                            try:
                                update_result = supabase.table("students").update({"is_admin": True}).eq("id", student_id).execute()
                                if update_result.data:
                                    admin_added = True
                                    print(f"Admin status set via is_admin column for student_id: {student_id}")
                            except Exception as update_error:
                                print(f"Error setting is_admin column: {update_error}")
                        
                        if admin_added:
                            messages.success(request, f"Welcome, {full_name}! Your admin account was created successfully. You can now log in and access the admin dashboard.")
                        else:
                            # Last resort: store admin status in session as temporary workaround
                            messages.warning(request, f"Welcome, {full_name}! Your account was created, but admin status setup encountered an issue. Please contact the administrator.")
                            print(f"WARNING: Failed to set admin status for student_id: {student_id}")
                    else:
                        messages.success(request, f"Welcome, {full_name}! Your account was created successfully.")
                    
                    return redirect('login')
                else:
                    # Handle response error
                    error_msg = "Unknown error"
                    if hasattr(response, 'error') and response.error:
                        error_msg = str(response.error)
                    elif hasattr(response, 'data') and not response.data:
                        error_msg = "Registration failed. Please try again."
                    
                    # Check if error is about duplicate username/email
                    error_str_lower = error_msg.lower()
                    if "username" in error_str_lower or ("unique" in error_str_lower and "username" in error_str_lower):
                        messages.error(request, "❌ Username is already taken. Please choose a different one.")
                    elif "email" in error_str_lower or ("unique" in error_str_lower and "email" in error_str_lower):
                        messages.error(request, "❌ Email is already taken. Please use a different email address.")
                    else:
                        messages.error(request, f"❌ Failed to register. {error_msg}")
                    return render(request, 'students/signup.html', {'form': form})
            except ConnectError as e:
                messages.error(
                    request,
                    "❌ Connection error: Cannot reach Supabase server. "
                    "Please check your internet connection and Supabase configuration. "
                    "Error: [Errno 11001] getaddrinfo failed"
                )
                print(f"Connection error: {e}")
            except Exception as e:
                error_msg = str(e)
                print(f"Signup error: {error_msg}")
                print(f"Error type: {type(e)}")
                # Check if it's a duplicate error
                if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
                    if "username" in error_msg.lower():
                        messages.error(request, "❌ Username is already taken. Please choose a different one.")
                    elif "email" in error_msg.lower():
                        messages.error(request, "❌ Email is already taken. Please use a different email address.")
                    else:
                        messages.error(request, "❌ This username or email is already in use. Please choose different ones.")
                else:
                    messages.error(request, f"❌ An error occurred: {error_msg}")
                return render(request, 'students/signup.html', {'form': form})
        else:
            # Form validation failed
            print("Form validation errors:", form.errors)
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"❌ {field}: {error}")
    else:
        form = StudentSignUpForm()
    return render(request, 'students/signup.html', {'form': form})


# Admin Registration
def admin_signup_view(request):
    if request.method == 'POST':
        form = AdminRegistrationForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            full_name = form.cleaned_data['full_name']
            password = form.cleaned_data['password']
            hashed_password = make_password(password)

            data = {
                "username": username,
                "email": email,
                "full_name": full_name,
                "password": hashed_password,
                "created_at": datetime.now().isoformat()  # Add created_at timestamp for Member Since
            }

            try:
                response = supabase.table("students").insert(data).execute()
                if response.data:
                    student_id = response.data[0]['id']
                    # Add to admins table
                    admin_added = False
                    try:
                        admin_data = {"student_id": student_id}
                        result = supabase.table("admins").insert(admin_data).execute()
                        if result.data:
                            admin_added = True
                            print(f"Admin account created successfully for student_id: {student_id}")
                    except Exception as admin_error:
                        error_msg = str(admin_error)
                        print(f"Error adding to admins table: {error_msg}")
                        
                        # Try alternative: Update students table with is_admin flag
                        try:
                            update_result = supabase.table("students").update({"is_admin": True}).eq("id", student_id).execute()
                            if update_result.data:
                                admin_added = True
                                print(f"Admin status set via is_admin column for student_id: {student_id}")
                        except Exception as update_error:
                            print(f"Error setting is_admin column: {update_error}")
                    
                    if admin_added:
                        messages.success(request, "✅ Admin account created successfully! Please log in and access the admin dashboard.")
                    else:
                        messages.warning(request, "⚠️ Account created, but admin status setup encountered issues. Please contact the administrator.")
                    return redirect('login')
                else:
                    messages.error(request, "❌ Failed to create admin account. Please try again.")
            except Exception as e:
                messages.error(request, f"❌ Error: {str(e)}")
    else:
        form = AdminRegistrationForm()
    
    return render(request, 'students/admin_signup.html', {'form': form})


# Student Login
def login_view(request):
    if request.method == 'POST':
        form = StudentLoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']

            try:
                response = supabase.table("students").select("*").eq("username", username).execute()
                if response.data:
                    student = response.data[0]
                    if check_password(password, student['password']):
                        # Check if user just logged out BEFORE doing anything else
                        # Store this value since we'll delete the flag later
                        just_logged_out = request.session.get('just_logged_out', False)
                        
                        # If user just logged out, consume all existing messages
                        # This ensures logout message doesn't persist after successful login
                        if just_logged_out:
                            # Consume all messages to prevent them from showing after redirect
                            storage = messages.get_messages(request)
                            for _ in storage:
                                pass  # Consume all messages
                            storage.used = True
                        
                        request.session['student'] = {
                            'id': student['id'],
                            'username': student['username'],
                            'email': student['email'],
                            'full_name': student.get('full_name', '')
                        }
                        
                        # Only show welcome message if:
                        # 1. User did NOT just log out (just_logged_out is False)
                        # 2. User hasn't already logged in this session (first login of session)
                        # The welcome message should only appear on first visit/login, not after logout->login
                        if not just_logged_out and not request.session.get('has_logged_in_this_session', False):
                            messages.success(request, f"👋 Welcome back, {student['username']}!")
                            request.session['has_logged_in_this_session'] = True
                        
                        # Remove the logout flag after we've used its value
                        if 'just_logged_out' in request.session:
                            del request.session['just_logged_out']
                        
                        request.session.modified = True  # Ensure session is saved
                        
                        # Redirect admins to admin dashboard, regular users to feed
                        # Check if user is admin using the is_admin function
                        # Debug: Check admin status
                        admin_status = is_admin(request)
                        print(f"Login: User {student['username']} (ID: {student['id']}) admin status: {admin_status}")
                        if admin_status:
                            print(f"Redirecting admin {student['username']} to admin_dashboard")
                            return redirect('admin_dashboard')
                        print(f"Redirecting regular user {student['username']} to feed")
                        return redirect('feed')
                    messages.error(request, "❌ Incorrect username or password.")
            except ConnectError as e:
                messages.error(
                    request,
                    "❌ Connection error: Cannot reach Supabase server. "
                    "Please check your internet connection and Supabase configuration."
                )
                print(f"Connection error: {e}")
            except Exception as e:
                messages.error(request, f"❌ An error occurred: {str(e)}")
                print(f"Error: {e}")
    else:
        form = StudentLoginForm()
    return render(request, 'students/login.html', {'form': form})


#Logout
def logout_view(request):
    # Set flag BEFORE deleting session to indicate user just logged out
    # This flag will be checked in login_view to prevent showing welcome message
    request.session['just_logged_out'] = True
    request.session.modified = True  # Ensure session is saved
    
    # Clear the login session flag so next fresh login will show welcome
    if 'has_logged_in_this_session' in request.session:
        del request.session['has_logged_in_this_session']
    if 'student' in request.session:
        del request.session['student']
    
    logout(request)
    
    # Add logout message - this will be the only message shown on login page
    messages.info(request, "You have been logged out.")
    return redirect('login')


#Student Dashboard
def student_dashboard(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    # Redirect admins to admin dashboard
    admin_status = is_admin(request)
    print(f"Dashboard: User {student.get('username')} admin status: {admin_status}")
    if admin_status:
        print("Redirecting to admin_dashboard")
        return redirect('admin_dashboard')
    
    return render(request, 'students/dashboard.html', {'student': student})

# Feed Page (default landing after login)
def feed_view(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    # Fetch full student data including profile picture from database
    try:
        response = supabase.table("students").select("id, username, email, full_name, profile_picture_url").eq("id", student['id']).execute()
        if response.data:
            student_data = response.data[0]
            # Update session with latest profile picture
            student['profile_picture_url'] = student_data.get('profile_picture_url', '')
            student['full_name'] = student_data.get('full_name', student.get('full_name', ''))
            request.session['student'] = student
            request.session.modified = True
            student = student_data  # Use full data for template
    except Exception as e:
        print(f"Error fetching student data for feed: {e}")
        # Continue with session data if fetch fails
    
    # Both admins and regular users can see the feed (approved posts)
    # Admins can also access the admin dashboard separately
    admin_flag = is_admin(request)
    return render(request, 'students/community.html', {'student': student, 'is_admin_flag': admin_flag})

# Community Page (alias to feed)
def community_view(request):
    return feed_view(request)

# Resources Page
def resources_view(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    return render(request, 'students/resources.html', {'student': student})

#Student Profile
# Student Profile
def student_profile(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    admin_flag = is_admin(request)
    
    # Fetch full student data from database
    try:
        response = supabase.table("students").select("*").eq("id", student['id']).execute()
        if response.data:
            student_data = response.data[0]
            
            # Convert created_at or date_joined to Philippine timezone (UTC+8)
            date_field = student_data.get('created_at') or student_data.get('date_joined')
            print(f"DEBUG: date_field value: {date_field}")  # Debug output
            if date_field:
                try:
                    # Parse the datetime string from Supabase (ISO format)
                    if isinstance(date_field, str):
                        # Try using dateutil parser if available
                        if date_parser:
                            dt = date_parser.parse(date_field)
                        else:
                            # Simple ISO format parsing (Python 3.7+)
                            try:
                                dt = datetime.fromisoformat(date_field.replace('Z', '+00:00'))
                            except:
                                # Fallback: basic string parsing
                                from datetime import datetime
                                dt = datetime.strptime(date_field[:19], '%Y-%m-%dT%H:%M:%S')
                    else:
                        dt = date_field
                    
                    # Convert to Philippine timezone (UTC+8)
                    if pytz:
                        ph_tz = pytz.timezone('Asia/Manila')
                        if dt.tzinfo is None:
                            # If naive datetime, assume it's UTC
                            dt = pytz.UTC.localize(dt)
                        ph_dt = dt.astimezone(ph_tz)
                        student_data['date_joined'] = ph_dt
                    else:
                        # Fallback: manually add 8 hours for Philippine time
                        from datetime import timedelta
                        if dt.tzinfo is None:
                            # Assume UTC and add 8 hours
                            ph_dt = dt + timedelta(hours=8)
                        else:
                            ph_dt = dt + timedelta(hours=8)
                        student_data['date_joined'] = ph_dt
                except Exception as e:
                    print(f"Error converting date to Philippine timezone: {e}")
                    # If conversion fails, try to use the original date as-is
                    student_data['date_joined'] = date_field
            else:
                # If no date field exists, set date_joined to None
                student_data['date_joined'] = None
            
            return render(request, 'students/profile.html', {'student': student_data, 'is_admin_flag': admin_flag})
    except Exception as e:
        print(f"Error fetching student profile: {e}")
    
    # Fallback: If database fetch failed, try to get date from session or set to None
    if student and not student.get('date_joined') and not student.get('created_at'):
        student['date_joined'] = None
    
    return render(request, 'students/profile.html', {'student': student, 'is_admin_flag': admin_flag})

# Edit Profile
def profile_edit(request):
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    admin_flag = is_admin(request)
    
    # Fetch full student data from database
    profile = None
    try:
        response = supabase.table("students").select("*").eq("id", student['id']).execute()
        if response.data:
            profile = response.data[0]
            # Update session with latest data (especially profile_picture_url)
            request.session['student'] = {
                'id': profile['id'],
                'username': profile.get('username', student.get('username')),
                'email': profile.get('email', student.get('email')),
                'full_name': profile.get('full_name', student.get('full_name', '')),
                'profile_picture_url': profile.get('profile_picture_url', student.get('profile_picture_url'))
            }
            request.session.modified = True
    except Exception as e:
        print(f"Error fetching profile data: {e}")
        pass
    
    # If no profile data found, use session data
    if not profile:
        profile = student
    
    return render(request, 'students/profile_edit.html', {
        'student': student,
        'profile': profile,
        'is_admin_flag': admin_flag
    })

# Change Password
def change_password(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not all([current_password, new_password, confirm_password]):
            return JsonResponse({'success': False, 'error': 'All fields are required'}, status=400)
        
        if new_password != confirm_password:
            return JsonResponse({'success': False, 'error': 'New passwords do not match'}, status=400)
        
        if len(new_password) < 6:
            return JsonResponse({'success': False, 'error': 'Password must be at least 6 characters'}, status=400)
        
        # Verify current password
        response = supabase.table("students").select("*").eq("id", student['id']).execute()
        if not response.data:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
        
        student_data = response.data[0]
        if not check_password(current_password, student_data['password']):
            return JsonResponse({'success': False, 'error': 'Current password is incorrect'}, status=400)
        
        # Update password in Supabase
        hashed_password = make_password(new_password)
        update_response = supabase.table("students").update({"password": hashed_password}).eq("id", student['id']).execute()
        
        if update_response.data:
            return JsonResponse({'success': True, 'message': 'Password updated successfully'})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to update password'}, status=500)
            
    except Exception as e:
        print(f"Error changing password: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Update Profile
def update_profile(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        update_data = {}
        student_id = student['id']
        
        # Handle FormData (for file uploads)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Get form fields
            full_name = request.POST.get('full_name', '').strip()
            email = request.POST.get('email', '').strip()
            username = request.POST.get('username', '').strip()
            bio = request.POST.get('bio', '').strip()
            phone = request.POST.get('phone', '').strip()
            location = request.POST.get('location', '').strip()
            date_of_birth = request.POST.get('date_of_birth', '').strip()
            
            # Validate required fields
            if not username:
                return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
            if not email:
                return JsonResponse({'success': False, 'error': 'Email is required'}, status=400)
            
            # Check if username is already taken (by another user)
            if username != student.get('username'):
                check_response = supabase.table("students").select("id").eq("username", username).neq("id", student_id).execute()
                if check_response.data and len(check_response.data) > 0:
                    return JsonResponse({'success': False, 'error': 'Username already taken'}, status=400)
            
            # Check if email is already taken (by another user)
            if email != student.get('email'):
                check_response = supabase.table("students").select("id").eq("email", email).neq("id", student_id).execute()
                if check_response.data and len(check_response.data) > 0:
                    return JsonResponse({'success': False, 'error': 'Email already taken'}, status=400)
            
            # Add fields to update_data (include all fields, even if empty, so users can clear them)
            update_data['username'] = username
            update_data['email'] = email
            update_data['full_name'] = full_name if full_name else ''
            update_data['bio'] = bio if bio else ''
            update_data['phone'] = phone if phone else ''
            update_data['location'] = location if location else ''
            update_data['date_of_birth'] = date_of_birth if date_of_birth else None
            
            # Handle profile picture upload
            if 'profile_picture' in request.FILES:
                picture_file = request.FILES['profile_picture']
                
                # Validate file size (max 5MB)
                if picture_file.size > 5 * 1024 * 1024:
                    return JsonResponse({'success': False, 'error': 'Image file too large (max 5MB)'}, status=400)
                
                # Validate file type
                if not picture_file.content_type.startswith('image/'):
                    return JsonResponse({'success': False, 'error': 'Invalid file type. Please upload an image.'}, status=400)
                
                # Process image if PIL is available
                file_data = None
                if PIL_AVAILABLE and Image:
                    try:
                        img = Image.open(picture_file)
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        img.thumbnail((400, 400), Image.Resampling.LANCZOS)
                        
                        # Save to BytesIO
                        output = BytesIO()
                        img.save(output, format='JPEG', quality=85)
                        output.seek(0)
                        file_data = output.read()
                    except Exception as e:
                        print(f"Image processing error: {e}")
                        # If image processing fails, use original file
                        picture_file.seek(0)
                        file_data = picture_file.read()
                else:
                    # Without PIL, use file as-is
                    picture_file.seek(0)
                    file_data = picture_file.read()
                
                # Upload to Supabase Storage
                file_path = f"profile_pics/{student_id}_{int(timezone.now().timestamp())}.jpg"
                try:
                    # Upload file to Supabase Storage (upsert replaces existing file)
                    upload_response = supabase.storage.from_("profile-pictures").upload(
                        file_path,
                        file_data,
                        file_options={"content-type": "image/jpeg", "upsert": "true"}
                    )
                    
                    # Get public URL
                    url_response = supabase.storage.from_("profile-pictures").get_public_url(file_path)
                    update_data['profile_picture_url'] = url_response
                    print(f"Profile picture uploaded successfully: {url_response}")
                    
                except Exception as e:
                    print(f"Error uploading profile picture: {e}")
                    return JsonResponse({'success': False, 'error': f'Failed to upload profile picture: {str(e)}'}, status=500)
        
        else:
            # Handle JSON data (for regular fields without file upload)
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': 'Invalid request format'}, status=400)
            
            full_name = data.get('full_name', '').strip()
            email = data.get('email', '').strip()
            username = data.get('username', '').strip()
            bio = data.get('bio', '').strip()
            phone = data.get('phone', '').strip()
            location = data.get('location', '').strip()
            date_of_birth = data.get('date_of_birth', '').strip()
            
            # Validate required fields
            if not username:
                return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
            if not email:
                return JsonResponse({'success': False, 'error': 'Email is required'}, status=400)
            
            # Check if username is already taken
            if username != student.get('username'):
                check_response = supabase.table("students").select("id").eq("username", username).neq("id", student_id).execute()
                if check_response.data and len(check_response.data) > 0:
                    return JsonResponse({'success': False, 'error': 'Username already taken'}, status=400)
            
            # Check if email is already taken
            if email != student.get('email'):
                check_response = supabase.table("students").select("id").eq("email", email).neq("id", student_id).execute()
                if check_response.data and len(check_response.data) > 0:
                    return JsonResponse({'success': False, 'error': 'Email already taken'}, status=400)
            
            # Add all fields to update_data (include all fields, even if empty)
            update_data['username'] = username
            update_data['email'] = email
            update_data['full_name'] = full_name if full_name else ''
            update_data['bio'] = bio if bio else ''
            update_data['phone'] = phone if phone else ''
            update_data['location'] = location if location else ''
            update_data['date_of_birth'] = date_of_birth if date_of_birth else None
        
        # Update student table in Supabase
        if update_data:
            try:
                response = supabase.table("students").update(update_data).eq("id", student_id).execute()
                
                if response and response.data:
                    # Get updated student data
                    updated_student = response.data[0]
                    
                    # Update session with new data (include all updated fields)
                    request.session['student'] = {
                        'id': updated_student['id'],
                        'username': updated_student.get('username', student.get('username')),
                        'email': updated_student.get('email', student.get('email')),
                        'full_name': updated_student.get('full_name', student.get('full_name', '')),
                        'profile_picture_url': updated_student.get('profile_picture_url', student.get('profile_picture_url')),
                        'bio': updated_student.get('bio', ''),
                        'phone': updated_student.get('phone', ''),
                        'location': updated_student.get('location', ''),
                        'date_of_birth': updated_student.get('date_of_birth')
                    }
                    request.session.modified = True
                    
                    return JsonResponse({
                        'success': True, 
                        'message': 'Profile updated successfully', 
                        'student': updated_student
                    })
                else:
                    return JsonResponse({'success': False, 'error': 'Failed to update profile'}, status=500)
                    
            except Exception as e:
                print(f"Error updating profile in Supabase: {e}")
                return JsonResponse({'success': False, 'error': f'Failed to update profile: {str(e)}'}, status=500)
        else:
            return JsonResponse({'success': False, 'error': 'No fields to update'}, status=400)
            
    except Exception as e:
        print(f"Unexpected error in update_profile: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': f'An error occurred: {str(e)}'}, status=500)


# Save Mood Entry
def save_mood(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        mood = data.get('mood')
        mood_emoji = data.get('mood_emoji')
        score = data.get('score')
        date = data.get('date', datetime.now().isoformat())
        
        if not mood or score is None:
            return JsonResponse({'success': False, 'error': 'Missing required fields'}, status=400)
        
        mood_data = {
            "student_id": student['id'],
            "mood": mood,
            "mood_emoji": mood_emoji,
            "score": score,
            "date": date
        }
        
        response = supabase.table("moods").insert(mood_data).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'message': 'Mood saved successfully'})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to save mood'}, status=500)
            
    except ConnectError as e:
        return JsonResponse({'success': False, 'error': 'Connection error'}, status=503)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


# Get Mood Entries
def get_moods(request):
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        response = supabase.table("moods").select("*").eq("student_id", student['id']).order("date", desc=True).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'moods': response.data})
        else:
            return JsonResponse({'success': True, 'moods': []})
            
    except ConnectError as e:
        return JsonResponse({'success': False, 'error': 'Connection error'}, status=503)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Journal CRUD
def get_journals(request):
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        response = supabase.table("journals").select("*").eq("student_id", student['id']).order("created_at", desc=True).execute()
        return JsonResponse({'success': True, 'journals': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def create_journal(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        title = data.get('title', 'Untitled')
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)
        
        journal_data = {
            "student_id": student['id'],
            "title": title,
            "content": content,
            "created_at": datetime.now().isoformat()
        }
        
        response = supabase.table("journals").insert(journal_data).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'journal': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to create journal'}, status=500)
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def update_journal(request, journal_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        title = data.get('title')
        
        update_data = {}
        if content:
            update_data['content'] = content
        if title:
            update_data['title'] = title
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = supabase.table("journals").update(update_data).eq("id", journal_id).eq("student_id", student['id']).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'journal': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Journal not found or unauthorized'}, status=404)
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def delete_journal(request, journal_id):
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        response = supabase.table("journals").delete().eq("id", journal_id).eq("student_id", student['id']).execute()
        return JsonResponse({'success': True, 'message': 'Journal deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Anonymous Posts
def get_anonymous_posts(request):
    try:
        # Prefer the explicit status column; fall back to the legacy approved flag
        try:
            response = supabase.table("posts").select("*").eq("status", "approved").execute()
        except Exception:
            response = supabase.table("posts").select("*").eq("approved", True).execute()
        
        # Format posts with author information
        posts = []
        if response.data:
            # Get all unique student IDs for non-anonymous posts
            student_ids = [post.get('student_id') for post in response.data if post.get('student_id') and not post.get('is_anonymous', True)]
            student_ids = list(set(student_ids))
            
            # Fetch student data
            student_map = {}
            if student_ids:
                try:
                    students_response = supabase.table("students").select("id, username, full_name").in_("id", student_ids).execute()
                    if students_response.data:
                        for student in students_response.data:
                            student_map[student['id']] = student.get('full_name') or student.get('username', 'Unknown')
                except:
                    pass
            
            # Get all post IDs for comment counting
            post_ids = [post.get('id') for post in response.data if post.get('id')]
            
            # Get comment counts for all posts
            comment_counts = {}
            if post_ids:
                try:
                    # Try both table names for compatibility
                    try:
                        comments_response = supabase.table("comments").select("post_id").in_("post_id", post_ids).execute()
                    except:
                        comments_response = supabase.table("post_comments").select("post_id").in_("post_id", post_ids).execute()
                    
                    if comments_response.data:
                        for comment in comments_response.data:
                            post_id = comment.get('post_id')
                            if post_id:
                                comment_counts[post_id] = comment_counts.get(post_id, 0) + 1
                except Exception as e:
                    print(f"Error fetching comment counts: {e}")
            
            # Format posts
            for post in response.data:
                post_data = post.copy()
                post_status = post.get('status') or ('approved' if post.get('approved') else 'pending')
                post_data['status'] = post_status
                post_data['approved'] = post_status == 'approved'
                if not post.get('is_anonymous', True) and post.get('student_id'):
                    student_id = post['student_id']
                    if student_id in student_map:
                        post_data['author_name'] = student_map[student_id]
                    else:
                        post_data['author_name'] = 'Unknown'
                else:
                    post_data['is_anonymous'] = True
                
                # Add comment count
                post_id = post.get('id')
                post_data['comments_count'] = comment_counts.get(post_id, 0)
                
                posts.append(post_data)
            
            # Sort by created_at descending (newest first)
            posts.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return JsonResponse({'success': True, 'posts': posts})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def create_anonymous_post(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        student = request.session.get('student', None)
        if not student:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
        
        data = json.loads(request.body)
        content = data.get('content')
        is_anonymous = data.get('is_anonymous', True)  # Default to anonymous
        # Posts need admin approval - store explicit status
        approved = False
        status = "pending"
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)
        
        post_data = {
            "content": content,
            "approved": approved,  # Legacy flag for backward compatibility
            "status": status,
            "is_anonymous": is_anonymous,
            "student_id": student['id'],  # Always include student_id for admin tracking
            "created_at": datetime.now().isoformat()
        }
        
        response = supabase.table("posts").insert(post_data).execute()
        
        if response.data:
            return JsonResponse({
                'success': True, 
                'post': response.data[0], 
                'message': 'Post submitted successfully and is pending admin approval'
            })
        else:
            return JsonResponse({'success': False, 'error': 'Failed to create post'}, status=500)
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Likes and Comments
def like_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        # Try both table names for compatibility
        try:
            check_response = supabase.table("likes").select("*").eq("post_id", post_id).eq("student_id", student['id']).execute()
            table_name = "likes"
        except:
            check_response = supabase.table("post_likes").select("*").eq("post_id", post_id).eq("student_id", student['id']).execute()
            table_name = "post_likes"
        
        if check_response.data and len(check_response.data) > 0:
            supabase.table(table_name).delete().eq("post_id", post_id).eq("student_id", student['id']).execute()
            return JsonResponse({'success': True, 'liked': False})
        else:
            like_data = {
                "post_id": post_id,
                "student_id": student['id'],
                "created_at": datetime.now().isoformat()
            }
            supabase.table(table_name).insert(like_data).execute()
            return JsonResponse({'success': True, 'liked': True})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def get_likes(request, post_id):
    """Get like count and check if current user liked the post"""
    try:
        student = request.session.get('student', None)
        student_id = student['id'] if student else None
        
        # Get all likes for this post
        likes_response = supabase.table("likes").select("*").eq("post_id", post_id).execute()
        likes = likes_response.data if likes_response.data else []
        
        # Count likes
        like_count = len(likes)
        
        # Check if current user liked
        is_liked = False
        if student_id:
            user_like = [like for like in likes if like.get('student_id') == student_id]
            is_liked = len(user_like) > 0
        
        return JsonResponse({
            'success': True,
            'count': like_count,
            'is_liked': is_liked
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def get_comments(request, post_id):
    try:
        # Try both table names for compatibility
        try:
            response = supabase.table("comments").select("*").eq("post_id", post_id).order("created_at", desc=False).execute()
        except:
            response = supabase.table("post_comments").select("*").eq("post_id", post_id).order("created_at", desc=False).execute()
        
        comments = response.data if response.data else []
        
        # Get student information for comments
        student_ids = [comment.get('student_id') for comment in comments if comment.get('student_id')]
        student_map = {}
        if student_ids:
            try:
                students_response = supabase.table("students").select("id, username, full_name, profile_picture_url").in_("id", list(set(student_ids))).execute()
                if students_response.data:
                    for student in students_response.data:
                        student_map[student['id']] = {
                            'username': student.get('username', 'Unknown'),
                            'full_name': student.get('full_name', ''),
                            'profile_picture_url': student.get('profile_picture_url', '')
                        }
            except Exception as e:
                print(f"Error fetching student info for comments: {e}")
        
        # Add student info to each comment
        for comment in comments:
            student_id = comment.get('student_id')
            if student_id and student_id in student_map:
                comment['student'] = student_map[student_id]
            else:
                comment['student'] = {
                    'username': 'Unknown',
                    'full_name': '',
                    'profile_picture_url': ''
                }
        
        return JsonResponse({'success': True, 'comments': comments})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def create_comment(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)
        
        comment_data = {
            "post_id": post_id,
            "student_id": student['id'],
            "content": content,
            "created_at": datetime.now().isoformat()
        }
        
        # Try both table names for compatibility
        try:
            response = supabase.table("comments").insert(comment_data).execute()
        except:
            response = supabase.table("post_comments").insert(comment_data).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'comment': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to create comment'}, status=500)
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Alias functions for URL compatibility
def toggle_like(request, post_id):
    """Alias for like_post to match URL pattern"""
    return like_post(request, post_id)

def add_comment(request, post_id):
    """Alias for create_comment to match URL pattern"""
    return create_comment(request, post_id)

# Edit Post
def edit_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)
        
        # Check if post belongs to the student
        post_response = supabase.table("posts").select("*").eq("id", post_id).execute()
        if not post_response.data:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
        
        post = post_response.data[0]
        if post.get('student_id') != student['id']:
            return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
        
        # Update the post
        update_response = supabase.table("posts").update({
            "content": content,
            "updated_at": datetime.now().isoformat()
        }).eq("id", post_id).execute()
        
        if update_response.data:
            return JsonResponse({'success': True, 'post': update_response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to update post'}, status=500)
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Delete Post
def delete_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        # Check if post belongs to the student
        post_response = supabase.table("posts").select("*").eq("id", post_id).execute()
        if not post_response.data:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
        
        post = post_response.data[0]
        if post.get('student_id') != student['id']:
            return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
        
        # Delete the post (this will cascade delete likes and comments if foreign keys are set up)
        supabase.table("posts").delete().eq("id", post_id).execute()
        return JsonResponse({'success': True, 'message': 'Post deleted successfully'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Wellness Resources
def get_wellness_resources(request):
    try:
        search_query = request.GET.get('search', '')
        resource_type = request.GET.get('type', '')
        
        query = supabase.table("wellness_resources").select("*")
        
        if search_query:
            query = query.or_("title.ilike.%{search}%,description.ilike.%{search}%".format(search=search_query))
        
        if resource_type:
            query = query.eq("type", resource_type)
        
        response = query.order("created_at", desc=True).execute()
        return JsonResponse({'success': True, 'resources': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': True, 'resources': []})

def get_hotlines(request):
    try:
        response = supabase.table("wellness_resources").select("*").eq("type", "hotline").order("name").execute()
        return JsonResponse({'success': True, 'hotlines': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': True, 'hotlines': []})

# Admin Helper
def is_admin(request):
    student = request.session.get('student', None)
    if not student:
        return False
    
    student_id = student.get('id')
    if not student_id:
        return False
    
    # Method 1: Check admins table (primary method)
    try:
        admin_response = supabase.table("admins").select("student_id").eq("student_id", student_id).execute()
        if admin_response.data and len(admin_response.data) > 0:
            print(f"Admin check: User {student_id} ({student.get('username', 'unknown')}) is admin (found in admins table)")
            return True
    except Exception as e:
        print(f"Error checking admins table: {e}")
    
    # Method 2: Check is_admin column in students table (fallback)
    try:
        response = supabase.table("students").select("is_admin").eq("id", student_id).execute()
        if response.data and response.data[0].get('is_admin'):
            print(f"Admin check: User {student_id} ({student.get('username', 'unknown')}) is admin (is_admin column)")
            return True
    except Exception as e2:
        print(f"Error checking is_admin column: {e2}")
    
    # Method 3: Check if username starts with 'admin' (temporary fallback for testing)
    username = student.get('username', '').lower()
    if username.startswith('admin'):
        print(f"Admin check: User {student_id} ({username}) is admin (username prefix fallback)")
        # Automatically add to admins table if not already there
        try:
            admin_data = {"student_id": student_id}
            supabase.table("admins").insert(admin_data).execute()
            print(f"Auto-added {username} to admins table")
            return True
        except:
            pass
    
    print(f"Admin check: User {student_id} ({student.get('username', 'unknown')}) is NOT admin")
    return False

# Admin Functions
def admin_get_posts(request):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        status_filter = request.GET.get('status')
        query = supabase.table("posts").select("*")

        # Apply status filters when provided
        if status_filter in ['pending', 'approved', 'declined']:
            try:
                query = query.eq("status", status_filter)
            except Exception:
                # Fallback for legacy approved flag
                if status_filter == 'approved':
                    query = query.eq("approved", True)
                elif status_filter == 'pending':
                    query = query.eq("approved", False)
                else:
                    # Declined has no legacy equivalent; fetch none via false condition
                    query = query.eq("approved", None)

        response = query.order("created_at", desc=True).execute()
        posts = response.data if response.data else []
        
        # Get student information for posts with student_id
        student_ids = [post.get('student_id') for post in posts if post.get('student_id')]
        student_map = {}
        if student_ids:
            try:
                students_response = supabase.table("students").select("id, username, full_name").in_("id", list(set(student_ids))).execute()
                if students_response.data:
                    for student in students_response.data:
                        student_map[student['id']] = {
                            'username': student.get('username', 'Unknown'),
                            'full_name': student.get('full_name', ''),
                            'id': student['id']
                        }
            except:
                pass
        
        # Add student info to posts
        for post in posts:
            post_status = post.get('status') or ('approved' if post.get('approved') else 'pending')
            post['status'] = post_status
            post['approved'] = post_status == 'approved'
            if post.get('student_id') and post['student_id'] in student_map:
                post['student'] = student_map[post['student_id']]
            else:
                post['student'] = None
        
        return JsonResponse({'success': True, 'posts': posts})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_approve_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        update_data = {
            "approved": True,
            "status": "approved"
        }
        response = supabase.table("posts").update(update_data).eq("id", post_id).execute()
        if response.data:
            return JsonResponse({'success': True, 'message': 'Post approved'})
        else:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_decline_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        update_data = {
            "approved": False,
            "status": "declined"
        }
        response = supabase.table("posts").update(update_data).eq("id", post_id).execute()
        if response.data:
            return JsonResponse({'success': True, 'message': 'Post declined'})
        else:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_pending_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        update_data = {
            "approved": False,
            "status": "pending"
        }
        response = supabase.table("posts").update(update_data).eq("id", post_id).execute()
        if response.data:
            return JsonResponse({'success': True, 'message': 'Post moved to pending'})
        else:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_delete_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        supabase.table("posts").delete().eq("id", post_id).execute()
        return JsonResponse({'success': True, 'message': 'Post deleted'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_get_resources(request):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        response = supabase.table("wellness_resources").select("*").order("created_at", desc=True).execute()
        return JsonResponse({'success': True, 'resources': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_create_resource(request):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        resource_data = {
            "name": data.get('name'),
            "type": data.get('type'),
            "description": data.get('description'),
            "url": data.get('url', ''),
            "phone": data.get('phone', ''),
            "created_at": datetime.now().isoformat()
        }
        
        response = supabase.table("wellness_resources").insert(resource_data).execute()
        if response.data:
            return JsonResponse({'success': True, 'resource': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to create resource'}, status=500)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_update_resource(request, resource_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'type' in data:
            update_data['type'] = data['type']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'url' in data:
            update_data['url'] = data['url']
        if 'phone' in data:
            update_data['phone'] = data['phone']
        
        response = supabase.table("wellness_resources").update(update_data).eq("id", resource_id).execute()
        if response.data:
            return JsonResponse({'success': True, 'resource': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Resource not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_delete_resource(request, resource_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        supabase.table("wellness_resources").delete().eq("id", resource_id).execute()
        return JsonResponse({'success': True, 'message': 'Resource deleted'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Utility function to manually add admin (for debugging/fixing admin accounts)
def add_admin_utility(request):
    """Utility endpoint to manually add current user as admin. 
    Only works if logged in. Access via /students/add-admin-utility/"""
    student = request.session.get('student', None)
    if not student:
        return JsonResponse({'success': False, 'error': 'Not logged in'}, status=401)
    
    try:
        # Check if already admin
        admin_response = supabase.table("admins").select("student_id").eq("student_id", student['id']).execute()
        if admin_response.data and len(admin_response.data) > 0:
            return JsonResponse({'success': True, 'message': f'User {student["username"]} is already an admin'})
        
        # Add to admins table
        admin_data = {"student_id": student['id']}
        result = supabase.table("admins").insert(admin_data).execute()
        return JsonResponse({
            'success': True, 
            'message': f'Successfully added {student["username"]} (ID: {student["id"]}) as admin',
            'data': result.data
        })
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'error': str(e),
            'message': f'Failed to add admin. Error: {str(e)}'
        }, status=500)

def admin_dashboard(request):
    if not is_admin(request):
        return redirect('dashboard')
    
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    # Get statistics
    try:
        # Get user count - fetch all and count
        try:
            users_response = supabase.table("students").select("id").execute()
            user_count = len(users_response.data) if users_response.data else 0
        except Exception as e:
            print(f"Error getting user count: {e}")
            user_count = 0
        
        # Get total post count - fetch all and count
        try:
            posts_response = supabase.table("posts").select("id").execute()
            post_count = len(posts_response.data) if posts_response.data else 0
        except Exception as e:
            print(f"Error getting post count: {e}")
            post_count = 0
        
        # Get pending posts count
        try:
            pending_response = supabase.table("posts").select("id").eq("status", "pending").execute()
            pending_count = len(pending_response.data) if pending_response.data else 0
        except Exception:
            try:
                # Fallback to approved flag
                pending_response = supabase.table("posts").select("id").eq("approved", False).execute()
                pending_count = len(pending_response.data) if pending_response.data else 0
            except Exception as e:
                print(f"Error getting pending count: {e}")
                pending_count = 0
        
        # Get resource count
        try:
            resources_response = supabase.table("wellness_resources").select("id").execute()
            resource_count = len(resources_response.data) if resources_response.data else 0
        except Exception as e:
            print(f"Error getting resource count: {e}")
            resource_count = 0
        
        stats = {
            'user_count': user_count,
            'post_count': post_count,
            'pending_count': pending_count,
            'resource_count': resource_count
        }
        print(f"Admin Dashboard Stats: {stats}")  # Debug output
    except Exception as e:
        print(f"Error getting admin dashboard stats: {e}")
        stats = {
            'user_count': 0,
            'post_count': 0,
            'pending_count': 0,
            'resource_count': 0
        }
    
    return render(request, 'students/admin_dashboard.html', {'stats': stats, 'student': student})

# Admin Manage Users Page
def admin_users_view(request):
    if not is_admin(request):
        return redirect('dashboard')
    
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    # Get stats for navbar
    stats = {'pending_count': 0}
    try:
        try:
            pending_response = supabase.table("posts").select("id").eq("status", "pending").execute()
        except Exception:
            pending_response = supabase.table("posts").select("id").eq("approved", False).execute()
        stats['pending_count'] = len(pending_response.data) if pending_response.data else 0
    except:
        pass
    
    return render(request, 'students/admin_users.html', {'student': student, 'stats': stats})

# Admin Manage Posts Page
def admin_posts_view(request):
    if not is_admin(request):
        return redirect('dashboard')
    
    student = request.session.get('student', None)
    if not student:
        return redirect('login')

    # Get stats for navbar
    stats = {'pending_count': 0}
    try:
        try:
            pending_response = supabase.table("posts").select("id").eq("status", "pending").execute()
        except Exception:
            pending_response = supabase.table("posts").select("id").eq("approved", False).execute()
        stats['pending_count'] = len(pending_response.data) if pending_response.data else 0
    except:
        pass
    
    return render(request, 'students/admin_posts.html', {'student': student, 'stats': stats})

# Admin Resources Page
def admin_resources_view(request):
    if not is_admin(request):
        return redirect('dashboard')
    
    student = request.session.get('student', None)
    if not student:
        return redirect('login')
    
    stats = {'pending_count': 0}
    try:
        try:
            pending_response = supabase.table("posts").select("id").eq("status", "pending").execute()
        except Exception:
            pending_response = supabase.table("posts").select("id").eq("approved", False).execute()
        stats['pending_count'] = len(pending_response.data) if pending_response.data else 0
    except:
        pass
    
    return render(request, 'students/admin_dashboard.html', {'stats': stats, 'student': student})

# Admin User Management
def admin_get_users(request):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        search_query = request.GET.get('search', '')
        query = supabase.table("students").select("*")
        
        if search_query:
            # Search in username, email, or full_name
            query = query.or_(f"username.ilike.%{search_query}%,email.ilike.%{search_query}%,full_name.ilike.%{search_query}%")
        
        response = query.order("created_at", desc=True).execute()
        users = response.data if response.data else []
        
        # Add post count for each user
        for user in users:
            try:
                posts_response = supabase.table("posts").select("id", count="exact").eq("student_id", user['id']).execute()
                user['post_count'] = len(posts_response.data) if posts_response.data else 0
            except Exception:
                user['post_count'] = 0
        
        return JsonResponse({'success': True, 'users': users})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_update_user(request, user_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        update_data = {}
        
        if 'is_admin' in data:
            update_data['is_admin'] = data['is_admin']
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'email' in data:
            update_data['email'] = data['email']
        
        if update_data:
            response = supabase.table("students").update(update_data).eq("id", user_id).execute()
            if response.data:
                return JsonResponse({'success': True, 'message': 'User updated successfully', 'user': response.data[0]})
        
        return JsonResponse({'success': False, 'error': 'No fields to update'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_delete_user(request, user_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Don't allow deleting yourself
        student = request.session.get('student', None)
        if student and student['id'] == user_id:
            return JsonResponse({'success': False, 'error': 'Cannot delete your own account'}, status=400)

        # Remove user's interactions first
        try:
            supabase.table("post_comments").delete().eq("student_id", user_id).execute()
        except Exception:
            pass
        try:
            supabase.table("post_likes").delete().eq("student_id", user_id).execute()
        except Exception:
            pass

        # Find and delete the user's posts (and related data)
        try:
            posts_response = supabase.table("posts").select("id").eq("student_id", user_id).execute()
            post_ids = [p['id'] for p in posts_response.data] if posts_response.data else []
            if post_ids:
                try:
                    supabase.table("post_comments").delete().in_("post_id", post_ids).execute()
                except Exception:
                    pass
                try:
                    supabase.table("post_likes").delete().in_("post_id", post_ids).execute()
                except Exception:
                    pass
                supabase.table("posts").delete().in_("id", post_ids).execute()
        except Exception:
            pass

        # Remove admin record if present
        try:
            supabase.table("admins").delete().eq("student_id", user_id).execute()
        except Exception:
            pass

        supabase.table("students").delete().eq("id", user_id).execute()
        return JsonResponse({'success': True, 'message': 'User and related posts deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

