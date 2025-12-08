# Additional views to add to views.py
# Copy all functions from this file to the end of views.py

# Password Change
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
        
        # Verify current password
        response = supabase.table("students").select("*").eq("id", student['id']).execute()
        if not response.data:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
        
        student_data = response.data[0]
        if not check_password(current_password, student_data['password']):
            return JsonResponse({'success': False, 'error': 'Current password is incorrect'}, status=400)
        
        # Update password
        hashed_password = make_password(new_password)
        update_response = supabase.table("students").update({"password": hashed_password}).eq("id", student['id']).execute()
        
        if update_response.data:
            return JsonResponse({'success': True, 'message': 'Password updated successfully'})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to update password'}, status=500)
            
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
        response = supabase.table("anonymous_posts").select("*").eq("approved", True).order("created_at", desc=True).execute()
        return JsonResponse({'success': True, 'posts': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def create_anonymous_post(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)
        
        post_data = {
            "content": content,
            "approved": False,
            "created_at": datetime.now().isoformat()
        }
        
        response = supabase.table("anonymous_posts").insert(post_data).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'post': response.data[0], 'message': 'Post submitted for approval'})
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
        check_response = supabase.table("post_likes").select("*").eq("post_id", post_id).eq("student_id", student['id']).execute()
        
        if check_response.data and len(check_response.data) > 0:
            supabase.table("post_likes").delete().eq("post_id", post_id).eq("student_id", student['id']).execute()
            return JsonResponse({'success': True, 'liked': False})
        else:
            like_data = {
                "post_id": post_id,
                "student_id": student['id'],
                "created_at": datetime.now().isoformat()
            }
            supabase.table("post_likes").insert(like_data).execute()
            return JsonResponse({'success': True, 'liked': True})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def get_comments(request, post_id):
    try:
        response = supabase.table("post_comments").select("*").eq("post_id", post_id).order("created_at", desc=False).execute()
        return JsonResponse({'success': True, 'comments': response.data if response.data else []})
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
        
        response = supabase.table("post_comments").insert(comment_data).execute()
        
        if response.data:
            return JsonResponse({'success': True, 'comment': response.data[0]})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to create comment'}, status=500)
            
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
    try:
        response = supabase.table("students").select("is_admin").eq("id", student['id']).execute()
        if response.data and response.data[0].get('is_admin'):
            return True
    except:
        pass
    return False

# Admin Functions
def admin_get_posts(request):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        response = supabase.table("anonymous_posts").select("*").order("created_at", desc=True).execute()
        return JsonResponse({'success': True, 'posts': response.data if response.data else []})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_approve_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        response = supabase.table("anonymous_posts").update({"approved": True}).eq("id", post_id).execute()
        if response.data:
            return JsonResponse({'success': True, 'message': 'Post approved'})
        else:
            return JsonResponse({'success': False, 'error': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def admin_delete_post(request, post_id):
    if not is_admin(request):
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    try:
        supabase.table("anonymous_posts").delete().eq("id", post_id).execute()
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

def admin_dashboard(request):
    if not is_admin(request):
        return redirect('dashboard')
    return render(request, 'students/admin_dashboard.html')

