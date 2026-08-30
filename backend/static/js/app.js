const api = '/api/';
const token = () => localStorage.getItem('access_token');
const authHeaders = () => token() ? {Authorization: `Bearer ${token()}`} : {};
const message = text => { const el = document.querySelector('#form-message'); if (el) el.textContent = text || ''; };
async function request(path, options = {}) { const isFormData = options.body instanceof FormData; const headers = {...authHeaders(), ...(options.headers||{})}; if (!isFormData) headers['Content-Type'] = 'application/json'; const response = await fetch(api + path, {...options, headers}); const data = await response.json().catch(()=>({})); if (!response.ok) throw new Error(Object.values(data).flat().join(' ') || data.detail || 'Request failed.'); return data; }
async function loadCourses(search=''){const el=document.querySelector('#course-list'); if(!el)return; try{const data=await request(`courses/?search=${encodeURIComponent(search)}`); const courses=data.results||data; el.innerHTML=courses.length?courses.map(c=>`<article class="card"><span class="tag">${c.code}</span><h3>${c.title}</h3><p>${c.description}</p><small>Instructor: ${c.instructor_name||'Instructor'}</small><p><button class="button small" onclick="enroll(${c.id})">Enroll now</button></p></article>`).join(''):'<p>No courses found.</p>';}catch(e){el.textContent=e.message}}
async function enroll(courseId){if(!token()){location.href='/login/';return;}try{await request('enrollments/',{method:'POST',body:JSON.stringify({course:courseId})});location.href='/dashboard/student/'}catch(e){alert(e.message)}}
async function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const expectedRole = form.get('expected_role');
  form.delete('expected_role');
  try {
    const data = await request('auth/login/', {method: 'POST', body: JSON.stringify(Object.fromEntries(form))});
    localStorage.setItem('access_token', data.access);
    const user = await profile();
    const isExpectedUser = (expectedRole === 'student' && !user.is_instructor)
      || (expectedRole === 'instructor' && user.is_instructor)
      || (expectedRole === 'admin' && user.is_staff);
    if (!isExpectedUser) {
      localStorage.removeItem('access_token');
      throw new Error(`This account is not an ${expectedRole} account. Use the correct login page.`);
    }
    location.href = user.is_staff ? '/dashboard/admin/' : (user.is_instructor ? '/dashboard/instructor/' : '/dashboard/student/');
  } catch (error) {
    message(error.message);
  }
}
async function register(event){event.preventDefault(); const form=new FormData(event.target); try{await request('auth/register/',{method:'POST',body:JSON.stringify(Object.fromEntries(form))}); location.href='/login/';}catch(e){message(e.message)}}
async function profile(){return request('auth/profile/');}
async function redirectByRole(){const user=await profile(); location.href=user.is_staff?'/dashboard/admin/':(user.is_instructor?'/dashboard/instructor/':'/dashboard/student/');}
function setNavigation(user){document.querySelectorAll('[data-guest]').forEach(e=>e.classList.toggle('hidden',!!user));document.querySelectorAll('[data-user]').forEach(e=>e.classList.toggle('hidden',!user));const link=document.querySelector('#dashboard-link');if(user&&link)link.href=user.is_staff?'/dashboard/admin/':(user.is_instructor?'/dashboard/instructor/':'/dashboard/student/');}
async function loadStudentDashboard(){try{const user=await profile();setNavigation(user);document.querySelector('#welcome').textContent=`Welcome, ${user.first_name||user.username}`;const [enrollments,submissions,lessons,assignments]=await Promise.all([request('enrollments/'),request('submissions/'),request('lessons/'),request('assignments/')]);const es=enrollments.results||enrollments;document.querySelector('#enrollment-list').innerHTML=es.length?es.map(e=>`<article class="card"><span class="tag">${e.status}</span><h3>${e.course_title}</h3><p>Progress: ${e.progress}%</p></article>`).join(''):'<p>You have not enrolled in a course yet.</p>';const ls=lessons.results||lessons;document.querySelector('#lesson-list').innerHTML=ls.length?ls.map(l=>`<article class="card"><span class="tag">Lesson ${l.position}</span><h3>${l.title}</h3><p>${l.content||'No written lesson content.'}</p>${l.video_url?`<a href="${l.video_url}" target="_blank">Watch video</a>`:''}</article>`).join(''):'<p>No lessons published yet.</p>';const as=assignments.results||assignments;document.querySelector('#assignment-list').innerHTML=as.length?as.map(a=>`<article class="card"><span class="tag">Due ${new Date(a.due_date).toLocaleDateString()}</span><h3>${a.title}</h3><p>${a.instructions}</p><button class="button small" onclick="submitAssignment(${a.id})">Submit work</button></article>`).join(''):'<p>No assignments available.</p>';const ss=submissions.results||submissions;document.querySelector('#submission-list').innerHTML=ss.length?`<table><tr><th>Assignment</th><th>Score</th><th>Submitted</th></tr>${ss.map(s=>`<tr><td>#${s.assignment}</td><td>${s.score??'Not graded'}</td><td>${new Date(s.submitted_at).toLocaleDateString()}</td></tr>`).join('')}</table>`:'<p>No submissions yet.</p>';}catch(e){location.href='/login/'}}
async function submitAssignment(event, assignmentId) {
  event.preventDefault();
  const form = new FormData(event.target);
  form.append('assignment', assignmentId);
  if (!form.get('content') && !form.get('file').name) { alert('Enter a response or select a file.'); return; }
  try { await request('submissions/', {method: 'POST', body: form}); alert('Assignment submitted successfully.'); loadStudentDashboard(); }
  catch (e) { alert(e.message); }
}
async function loadInstructorDashboard(){try{const user=await profile();setNavigation(user);document.querySelector('#welcome').textContent=`Welcome, ${user.first_name||user.username}`;const [data,submissions]=await Promise.all([request('courses/'),request('submissions/')]);const cs=(data.results||data).filter(c=>c.instructor_name===user.username);document.querySelector('#instructor-course-list').innerHTML=cs.length?cs.map(c=>`<article class="card"><span class="tag">${c.status}</span><h3>${c.title}</h3><p>${c.description}</p></article>`).join(''):'<p>You have not created courses yet.</p>';const ss=submissions.results||submissions;document.querySelector('#grading-list').innerHTML=ss.length?`<table><tr><th>Student</th><th>Assignment</th><th>Submission</th><th>Score</th><th></th></tr>${ss.map(s=>`<tr><td>${s.student}</td><td>#${s.assignment}</td><td>${s.content||'File submission'}</td><td>${s.score??'Not graded'}</td><td><button class="button small" onclick="gradeSubmission(${s.id})">Grade</button></td></tr>`).join('')}</table>`:'<p>No student submissions yet.</p>';}catch(e){location.href='/login/'}}
async function gradeSubmission(submissionId){const score=prompt('Enter score:');if(score===null)return;const feedback=prompt('Enter feedback:')||'';try{await request(`submissions/${submissionId}/`,{method:'PATCH',body:JSON.stringify({score:Number(score),feedback})});alert('Grade saved.');loadInstructorDashboard()}catch(e){alert(e.message)}}
function toggleCourseForm(){document.querySelector('#course-form').classList.toggle('hidden')}
async function createCourse(event){event.preventDefault();try{await request('courses/',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.target)))});event.target.reset();toggleCourseForm();loadInstructorDashboard()}catch(e){message(e.message)}}
function toggleAssignmentForm(){document.querySelector('#assignment-form').classList.toggle('hidden')}
async function createAssignment(event){event.preventDefault();const status=document.querySelector('#assignment-message');try{const values=Object.fromEntries(new FormData(event.target));values.due_date=new Date(values.due_date).toISOString();await request('assignments/',{method:'POST',body:JSON.stringify(values)});event.target.reset();toggleAssignmentForm();status.textContent='Assignment created successfully.';loadInstructorDashboard()}catch(e){status.textContent=e.message}}
document.querySelector('#logout-button')?.addEventListener('click',()=>{localStorage.removeItem('access_token');location.href='/'});
if(token())profile().then(setNavigation).catch(()=>localStorage.removeItem('access_token'));

if (token() && !document.querySelector('#profile-link')) {
  const link = document.createElement('a'); link.id = 'profile-link'; link.href = '/profile/'; link.textContent = 'Profile';
  document.querySelector('.site-header nav')?.insertBefore(link, document.querySelector('#logout-button'));
}

async function submitFileAssignment(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  form.append('assignment', event.currentTarget.dataset.assignment);
  if (!form.get('content')) { alert('Enter your test response before submitting.'); return; }
  try { await request('submissions/', {method: 'POST', body: form}); alert('Assignment submitted successfully.'); loadStudentDashboard(); }
  catch (e) { alert(e.message); }
}

async function populateAssignmentCourses() {
  const select = document.querySelector('#assignment-course'); if (!select) return;
  try { const data = await request('courses/'); const courses = data.results || data; select.innerHTML = '<option value="">Select a course</option>' + courses.map(course => `<option value="${course.id}">${course.title}</option>`).join(''); }
  catch (e) { select.innerHTML = '<option value="">Unable to load courses</option>'; }
}
if (document.querySelector('#assignment-course')) populateAssignmentCourses();

function addTestLinkField() {
  const assignmentForm = document.querySelector('#assignment-form');
  if (!assignmentForm || assignmentForm.querySelector('[name="test_link"]')) return;
  const input = document.createElement('input');
  input.name = 'test_link'; input.type = 'url'; input.placeholder = 'Test link (optional)';
  assignmentForm.querySelector('button').before(input);
}
addTestLinkField();

const studentAssignmentList = document.querySelector('#assignment-list');
if (studentAssignmentList) {
  new MutationObserver(async () => {
    try {
      const data = await request('assignments/'); const assignments = data.results || data;
      studentAssignmentList.querySelectorAll('.card').forEach(card => {
        const title = card.querySelector('h3')?.textContent;
        const assignment = assignments.find(item => item.title === title);
        if (assignment?.test_link && !card.querySelector('.test-link')) {
          const link = document.createElement('a'); link.className = 'button small test-link'; link.href = assignment.test_link; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open test';
          card.querySelector('p')?.after(link);
        }
      });
    } catch (e) { /* student dashboard will show its normal API error handling */ }
  }).observe(studentAssignmentList, {childList: true, subtree: true});
}

const studentSubmissionList = document.querySelector('#submission-list');
if (studentSubmissionList) {
  new MutationObserver(async () => {
    const table = studentSubmissionList.querySelector('table');
    if (!table || table.dataset.feedbackAdded) return;
    try {
      const data = await request('submissions/'); const submissions = data.results || data;
      table.dataset.feedbackAdded = 'true';
      table.rows[0].insertCell(2).outerHTML = '<th>Feedback</th>';
      [...table.rows].slice(1).forEach((row, index) => row.insertCell(2).textContent = submissions[index]?.feedback || 'No feedback yet');
    } catch (e) { /* normal dashboard error handling applies */ }
  }).observe(studentSubmissionList, {childList: true, subtree: true});
}

const studentLessonList = document.querySelector('#lesson-list');
if (studentLessonList) {
  new MutationObserver(async () => {
    const cards = studentLessonList.querySelectorAll('.card');
    if (!cards.length) return;
    try {
      const [lessonData, completionData] = await Promise.all([request('lessons/'), request('lesson-completions/')]);
      const lessons = lessonData.results || lessonData;
      const completed = new Set((completionData.results || completionData).map(item => item.lesson));
      cards.forEach(card => {
        const title = card.querySelector('h3')?.textContent;
        const lesson = lessons.find(item => item.title === title);
        if (!lesson || card.querySelector('.complete-lesson')) return;
        const button = document.createElement('button'); button.className = 'button small complete-lesson';
        if (completed.has(lesson.id)) { button.textContent = 'Completed'; button.disabled = true; }
        else { button.textContent = 'Mark complete'; button.addEventListener('click', () => completeLesson(lesson.id)); }
        card.append(button);
      });
    } catch (e) { /* dashboard already handles unavailable data */ }
  }).observe(studentLessonList, {childList: true, subtree: true});
}
async function completeLesson(lessonId) {
  try { await request('lesson-completions/', {method: 'POST', body: JSON.stringify({lesson: lessonId})}); alert('Lesson marked complete. Your progress has been updated.'); loadStudentDashboard(); }
  catch (e) { alert(e.message); }
}

async function loadCourseDetail(courseId) {
  const overview = document.querySelector('#course-overview');
  if (!overview) return;
  try {
    const [course, lessonData, assignmentData, enrollmentData] = await Promise.all([request(`courses/${courseId}/`), request('lessons/'), request('assignments/'), token() ? request('enrollments/') : Promise.resolve([])]);
    const enrollments = enrollmentData.results || enrollmentData;
    const enrollment = enrollments.find(item => item.course === courseId);
    overview.innerHTML = `<article class="card"><span class="tag">${course.code}</span><h1>${course.title}</h1><p>${course.description}</p>${instructorMarkup(course)}${enrollment ? `<p><strong>Your progress: ${enrollment.progress}%</strong></p>` : '<p>Log in and enroll to access this course.</p>'}</article>`;
    const lessons = (lessonData.results || lessonData).filter(item => item.course === courseId);
    document.querySelector('#course-lessons').innerHTML = lessons.length ? lessons.map(item => `<article class="card"><span class="tag">Lesson ${item.position}</span><h3>${item.title}</h3><p>${item.content || ''}</p>${item.video_url ? `<a href="${item.video_url}" target="_blank">Watch video</a>` : ''}</article>`).join('') : '<p>No lessons are available.</p>';
    const assignments = (assignmentData.results || assignmentData).filter(item => item.course === courseId);
    document.querySelector('#course-assignments').innerHTML = assignments.length ? assignments.map(item => `<article class="card"><span class="tag">Due ${new Date(item.due_date).toLocaleDateString()}</span><h3>${item.title}</h3><p>${item.instructions}</p>${item.test_link ? `<a class="button small" href="${item.test_link}" target="_blank">Open test</a>` : ''}</article>`).join('') : '<p>No assignments are available.</p>';
  } catch (e) { overview.innerHTML = `<p>${e.message}</p>`; }
}

function instructorMarkup(course) {
  const name = course.instructor_full_name || course.instructor_name || 'Instructor';
  const avatar = course.instructor_avatar_url
    ? `<img src="${course.instructor_avatar_url}" alt="${name}">`
    : `<span>${name.charAt(0).toUpperCase()}</span>`;
  return `<div class="instructor-summary"><div class="instructor-avatar">${avatar}</div><div><small>Instructor</small><strong>${name}</strong></div></div>`;
}

async function loadCourses(search = '') {
  const courseList = document.querySelector('#course-list');
  if (!courseList) return;
  try {
    const data = await request(`courses/?search=${encodeURIComponent(search)}`);
    const courses = data.results || data;
    courseList.innerHTML = courses.length
      ? courses.map(course => `<article class="card"><span class="tag">${course.code}</span><h3>${course.title}</h3><p>${course.description}</p>${instructorMarkup(course)}<p><a class="course-details-link" href="/courses/${course.id}/">View course details</a></p><button class="button small" onclick="enroll(${course.id})">Enroll now</button></article>`).join('')
      : '<p>No courses found.</p>';
  } catch (error) {
    courseList.textContent = error.message;
  }
}

async function editCourse(courseId) {
  try {
    const course = await request(`courses/${courseId}/`);
    const title = prompt('Course title:', course.title); if (title === null) return;
    const description = prompt('Course description:', course.description); if (description === null) return;
    const status = prompt('Status: draft or published', course.status); if (!['draft', 'published'].includes(status)) { alert('Status must be draft or published.'); return; }
    await request(`courses/${courseId}/`, {method: 'PATCH', body: JSON.stringify({title, description, status})});
    alert('Course updated. The change is visible to students immediately.'); loadInstructorDashboard();
  } catch (e) { alert(e.message); }
}
async function editAssignment(assignmentId) {
  try {
    const item = await request(`assignments/${assignmentId}/`);
    const title = prompt('Assignment title:', item.title); if (title === null) return;
    const instructions = prompt('Instructions:', item.instructions); if (instructions === null) return;
    const test_link = prompt('Test link (optional):', item.test_link || ''); if (test_link === null) return;
    await request(`assignments/${assignmentId}/`, {method: 'PATCH', body: JSON.stringify({title, instructions, test_link})});
    alert('Assignment updated.'); showInstructorManagement();
  } catch (e) { alert(e.message); }
}
async function editLesson(lessonId) {
  try {
    const item = await request(`lessons/${lessonId}/`);
    const title = prompt('Lesson title:', item.title); if (title === null) return;
    const content = prompt('Lesson content:', item.content); if (content === null) return;
    await request(`lessons/${lessonId}/`, {method: 'PATCH', body: JSON.stringify({title, content})});
    alert('Lesson updated.'); showInstructorManagement();
  } catch (e) { alert(e.message); }
}
async function showInstructorManagement() {
  const dashboard = document.querySelector('#grading-list'); if (!dashboard) return;
  let panel = document.querySelector('#instructor-management');
  if (!panel) { panel = document.createElement('section'); panel.id = 'instructor-management'; panel.innerHTML = '<h2>Manage lessons and assignments</h2><div id="manage-lessons" class="card-grid"></div><div id="manage-assignments" class="card-grid"></div>'; dashboard.before(panel); }
  try {
    const [lessonsResponse, assignmentsResponse] = await Promise.all([request('lessons/'), request('assignments/')]);
    const lessons = lessonsResponse.results || lessonsResponse; const assignments = assignmentsResponse.results || assignmentsResponse;
    document.querySelector('#manage-lessons').innerHTML = lessons.map(item => `<article class="card"><span class="tag">Lesson ${item.position}</span><h3>${item.title}</h3><button class="button small" onclick="editLesson(${item.id})">Edit lesson</button></article>`).join('') || '<p>No lessons yet.</p>';
    document.querySelector('#manage-assignments').innerHTML = assignments.map(item => `<article class="card"><span class="tag">Assignment</span><h3>${item.title}</h3><p>${item.instructions}</p><button class="button small" onclick="editAssignment(${item.id})">Edit assignment</button></article>`).join('') || '<p>No assignments yet.</p>';
  } catch (e) { /* main dashboard reports authentication issues */ }
}

async function loadProfilePage() {
  try {
    const user = await profile(); setNavigation(user);
    const form = document.querySelector('#profile-form');
    for (const field of ['first_name', 'last_name', 'email', 'bio']) form.elements[field].value = user[field] || '';
    document.querySelector('#profile-name').textContent = user.first_name || user.username;
    document.querySelector('#profile-role').textContent = `${user.role} · @${user.username}`;
    const avatar = document.querySelector('#profile-avatar');
    if (user.avatar_url) avatar.innerHTML = `<img src="${user.avatar_url}" alt="Profile photo">`;
    else avatar.textContent = (user.first_name || user.username).charAt(0).toUpperCase();
  } catch (e) { location.href = '/login/'; }
}
async function saveProfile(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const avatar = form.get('avatar'); if (!avatar?.name) form.delete('avatar');
  try { await request('auth/profile/', {method: 'PATCH', body: form}); message('Profile saved successfully.'); loadProfilePage(); }
  catch (e) { message(e.message); }
}

async function buildProfileMenu() {
  if (!token() || document.querySelector('#header-profile-menu')) return;
  try {
    const user = await profile();
    const nav = document.querySelector('.site-header nav'); if (!nav) return;
    document.querySelector('#profile-link')?.remove();
    const wrapper = document.createElement('div'); wrapper.id = 'header-profile-menu'; wrapper.className = 'header-profile-menu';
    const image = user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}">` : `<span>${(user.first_name || user.username).charAt(0).toUpperCase()}</span>`;
    wrapper.innerHTML = `<button class="avatar-trigger" aria-label="Open profile menu">${image}</button><div class="profile-dropdown hidden"><div class="profile-summary">${image}<div><strong>${user.first_name || user.username}</strong><small>${user.role}</small><small>@${user.username}</small></div></div><a href="/profile/">Profile</a><a id="dropdown-dashboard" href="${user.is_staff ? '/dashboard/admin/' : (user.is_instructor ? '/dashboard/instructor/' : '/dashboard/student/')}">Dashboard</a><button class="dropdown-logout">Log out</button></div>`;
    nav.insertBefore(wrapper, document.querySelector('#logout-button'));
    document.querySelector('#logout-button')?.classList.add('hidden');
    wrapper.querySelector('.avatar-trigger').addEventListener('click', () => wrapper.querySelector('.profile-dropdown').classList.toggle('hidden'));
    wrapper.querySelector('.dropdown-logout').addEventListener('click', () => { localStorage.removeItem('access_token'); location.href = '/'; });
    document.addEventListener('click', event => { if (!wrapper.contains(event.target)) wrapper.querySelector('.profile-dropdown').classList.add('hidden'); });
  } catch (e) { /* token cleanup is handled elsewhere */ }
}
buildProfileMenu();

function displayValue(value, fallback = 'Not provided') { return value || fallback; }
function profileAvatar(user) { return user.avatar_url ? `<img src="${user.avatar_url}" alt="Profile photo">` : (user.first_name || user.username).charAt(0).toUpperCase(); }
async function loadProfilePage() {
  try {
    const user = await profile(); setNavigation(user);
    const form = document.querySelector('#profile-form');
    for (const field of ['first_name','last_name','email','bio','phone_number','gender','date_of_birth','current_city','current_state','work_experience']) if (form.elements[field]) form.elements[field].value = user[field] || '';
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    document.querySelector('#profile-view').innerHTML = `<section class="profile-card identity-card"><div class="large-avatar">${profileAvatar(user)}</div><div class="identity-info"><h2 class="identity-name">${fullName} <span class="profile-badge">LearnSpace ID: ${user.username.toUpperCase()}</span></h2><div class="detail-grid"><div class="detail-item"><small>Email</small>${displayValue(user.email)}</div><div class="detail-item"><small>Role</small>${user.role}</div><div class="detail-item"><small>Date of birth</small>${displayValue(user.date_of_birth)}</div><div class="detail-item"><small>Phone</small>${displayValue(user.phone_number)}</div><div class="detail-item"><small>Gender</small>${displayValue(user.gender)}</div><div class="detail-item"><small>Bio</small>${displayValue(user.bio)}</div></div></div><button class="edit-profile" onclick="toggleProfileEdit()">Edit</button></section><section class="profile-card"><button class="edit-profile" onclick="toggleProfileEdit()">Edit</button><h2 class="generic-title">Generic Details</h2><div class="generic-grid"><div class="detail-item"><small>Work experience</small>${displayValue(user.work_experience, 'Fresher')}</div><div class="detail-item"><small>Current city</small>${displayValue(user.current_city)}</div><div class="detail-item"><small>Current state</small>${displayValue(user.current_state)}</div><div class="detail-item"><small>Account type</small>${user.is_instructor ? 'Instructor account' : 'Student account'}</div></div></section>`;
  } catch (e) { location.href = '/login/'; }
}
function toggleProfileEdit() { document.querySelector('#profile-form').classList.toggle('hidden'); document.querySelector('#profile-view').classList.toggle('hidden'); }
async function saveProfile(event) { event.preventDefault(); const form = new FormData(event.currentTarget); if (!form.get('avatar')?.name) form.delete('avatar'); try { await request('auth/profile/', {method:'PATCH', body:form}); message('Profile saved successfully.'); toggleProfileEdit(); loadProfilePage(); buildProfileMenu(); } catch (e) { message(e.message); } }
const instructorCourseList = document.querySelector('#instructor-course-list');
if (instructorCourseList) {
  new MutationObserver(async () => {
    try { const data = await request('courses/'); const courses = data.results || data; instructorCourseList.querySelectorAll('.card').forEach(card => { const course = courses.find(item => item.title === card.querySelector('h3')?.textContent); if (course && !card.querySelector('.edit-course')) { const button = document.createElement('button'); button.className = 'button small edit-course'; button.textContent = 'Edit course'; button.addEventListener('click', () => editCourse(course.id)); card.append(button); } }); }
    catch (e) { /* no-op */ }
  }).observe(instructorCourseList, {childList: true, subtree: true});
  showInstructorManagement();
}

const catalogue = document.querySelector('#course-list');
if (catalogue) {
  new MutationObserver(async () => {
    try {
      const data = await request('courses/'); const courses = data.results || data;
      catalogue.querySelectorAll('.card').forEach(card => {
        const course = courses.find(item => item.title === card.querySelector('h3')?.textContent);
        if (course && !card.querySelector('.course-details-link')) {
          const link = document.createElement('a'); link.className = 'course-details-link'; link.href = `/courses/${course.id}/`; link.textContent = 'View course details';
          card.append(document.createElement('p')); card.lastChild.append(link);
        }
      });
    } catch (e) { /* course catalogue handles its own errors */ }
  }).observe(catalogue, {childList:true, subtree:true});
}

const assignmentList = document.querySelector('#assignment-list');
if (assignmentList) {
  new MutationObserver(() => {
    assignmentList.querySelectorAll('button[onclick^="submitAssignment"]').forEach(button => {
      const assignmentId = button.getAttribute('onclick').match(/\d+/)[0];
      const form = document.createElement('form');
      form.className = 'submission-form'; form.dataset.assignment = assignmentId;
      form.innerHTML = '<textarea name="content" placeholder="Write your test response"></textarea><button class="button small">Submit work</button>';
      form.addEventListener('submit', submitFileAssignment);
      button.replaceWith(form);
    });
  }).observe(assignmentList, {childList: true, subtree: true});
}

async function loadInstructorDashboard() {
  try {
    const user = await profile();
    if (!user.is_instructor || user.is_staff) { location.href = user.is_staff ? '/dashboard/admin/' : '/dashboard/student/'; return; }
    setNavigation(user);
    document.querySelector('#welcome').textContent = `Welcome, ${user.first_name || user.username}`;
    const [courseResponse, submissionResponse, assignmentResponse] = await Promise.all([
      request('courses/'), request('submissions/'), request('assignments/')
    ]);
    const courses = (courseResponse.results || courseResponse).filter(course => course.instructor_name === user.username);
    const assignments = assignmentResponse.results || assignmentResponse;
    const assignmentNames = new Map(assignments.map(item => [item.id, item.title]));
    document.querySelector('#instructor-course-list').innerHTML = courses.length
      ? courses.map(course => `<article class="card"><span class="tag">${course.status}</span><h3>${course.title}</h3><p>${course.description}</p></article>`).join('')
      : '<p>You have not created courses yet.</p>';
    const submissions = submissionResponse.results || submissionResponse;
    document.querySelector('#grading-list').innerHTML = submissions.length
      ? `<table class="grading-table"><thead><tr><th>Student</th><th>Assignment</th><th>Response</th><th>Score</th><th>Action</th></tr></thead><tbody>${submissions.map(item => {
          const score = item.score === null ? '<span class="score-pill pending">Pending</span>' : `<span class="score-pill">${item.score}</span>`;
          return `<tr><td>Student #${item.student}</td><td><strong>${assignmentNames.get(item.assignment) || `Assignment #${item.assignment}`}</strong></td><td class="submission-response" title="${item.content || 'File submission'}">${item.content || 'File submission'}</td><td>${score}</td><td><button class="button small" onclick="gradeSubmission(${item.id})">Grade</button></td></tr>`;
        }).join('')}</tbody></table>`
      : '<p class="empty-state">No student submissions have been received yet.</p>';
  } catch (error) { location.href = '/login/'; }
}

async function loadAdminDashboard() {
  try {
    const user = await profile();
    if (!user.is_staff) { location.href = user.is_instructor ? '/dashboard/instructor/' : '/dashboard/student/'; return; }
    setNavigation(user);
    document.querySelector('#admin-welcome').textContent = `Welcome, ${user.first_name || user.username}`;
    const [overview, courseResponse, submissionResponse] = await Promise.all([
      request('admin/overview/'), request('courses/'), request('submissions/')
    ]);
    const labels = {users: 'Total users', students: 'Students', instructors: 'Instructors', courses: 'Courses', assignments: 'Assignments', submissions: 'Submissions'};
    document.querySelector('#admin-stats').innerHTML = Object.entries(overview.counts)
      .map(([key, value]) => `<article class="stat-card"><small>${labels[key]}</small><strong>${value}</strong></article>`).join('');
    document.querySelector('#admin-user-list').innerHTML = overview.users.length
      ? `<table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Status</th></tr></thead><tbody>${overview.users.map(item => `<tr><td><strong>${item.name}</strong></td><td>@${item.username}</td><td>${item.role}</td><td>${item.email || '—'}</td><td>${item.active ? 'Active' : 'Inactive'}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">No users found.</p>';
    const courses = courseResponse.results || courseResponse;
    document.querySelector('#admin-course-list').innerHTML = courses.length
      ? `<table><thead><tr><th>Course</th><th>Code</th><th>Instructor</th><th>Status</th></tr></thead><tbody>${courses.map(item => `<tr><td><strong>${item.title}</strong></td><td>${item.code}</td><td>${item.instructor_full_name || item.instructor_name}</td><td>${item.status}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">No courses found.</p>';
    const submissions = submissionResponse.results || submissionResponse;
    document.querySelector('#admin-submission-list').innerHTML = submissions.length
      ? `<table><thead><tr><th>Student</th><th>Assignment</th><th>Score</th><th>Submitted</th></tr></thead><tbody>${submissions.map(item => `<tr><td>Student #${item.student}</td><td>#${item.assignment}</td><td>${item.score === null ? 'Not graded' : item.score}</td><td>${new Date(item.submitted_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">No submissions found.</p>';
  } catch (error) { location.href = '/login/'; }
}

async function loadStudentDashboard() {
  try {
    const user = await profile();
    if (user.is_staff || user.is_instructor) { location.href = user.is_staff ? '/dashboard/admin/' : '/dashboard/instructor/'; return; }
    setNavigation(user);
    document.querySelector('#welcome').textContent = `Welcome, ${user.first_name || user.username}`;
    const [enrollmentResponse, submissionResponse, lessonResponse, assignmentResponse, completionResponse] = await Promise.all([
      request('enrollments/'), request('submissions/'), request('lessons/'), request('assignments/'), request('lesson-completions/')
    ]);
    const enrollments = enrollmentResponse.results || enrollmentResponse;
    const lessons = lessonResponse.results || lessonResponse;
    const assignments = assignmentResponse.results || assignmentResponse;
    const submissions = submissionResponse.results || submissionResponse;
    const completions = completionResponse.results || completionResponse;
    const completedLessonIds = new Set(completions.map(item => item.lesson));
    document.querySelector('#enrollment-list').innerHTML = enrollments.length
      ? enrollments.map(item => `<article class="card"><span class="tag">${item.status}</span><h3>${item.course_title}</h3><p class="course-progress">Progress: ${item.progress}%</p><div class="progress-track" aria-label="${item.progress}% complete"><div class="progress-value" style="width:${item.progress}%"></div></div></article>`).join('')
      : '<p>You have not enrolled in a course yet.</p>';
    document.querySelector('#lesson-list').innerHTML = lessons.length
      ? lessons.map(item => {
          const completed = completedLessonIds.has(item.id);
          return `<article class="card"><span class="tag">Class ${item.position}</span><h3>${item.title}</h3><p>${item.content || 'No written class content.'}</p>${item.video_url ? `<a href="${item.video_url}" target="_blank">Watch class</a>` : ''}<p>${completed ? '<span class="completed-lesson">✓ Class completed</span>' : `<button class="button small" onclick="completeLesson(${item.id})">Mark class complete</button>`}</p></article>`;
        }).join('')
      : '<p>No classes published yet.</p>';
    document.querySelector('#assignment-list').innerHTML = assignments.length
      ? assignments.map(item => {
          const submitted = submissions.some(submission => submission.assignment === item.id);
          return `<article class="card"><span class="tag">Task · Due ${new Date(item.due_date).toLocaleDateString()}</span><h3>${item.title}</h3><p>${item.instructions}</p>${item.test_link ? `<p><a href="${item.test_link}" target="_blank">Open task link</a></p>` : ''}${submitted ? '<span class="completed-lesson">✓ Task submitted</span>' : `<form class="submission-form" data-assignment="${item.id}"><textarea name="content" placeholder="Write your task response" required></textarea><button class="button small">Submit task</button></form>`}</article>`;
        }).join('')
      : '<p>No tasks available.</p>';
    document.querySelectorAll('.submission-form').forEach(form => form.addEventListener('submit', submitFileAssignment));
    document.querySelector('#submission-list').innerHTML = submissions.length
      ? `<table><thead><tr><th>Task</th><th>Score</th><th>Submitted</th></tr></thead><tbody>${submissions.map(item => `<tr><td>Task #${item.assignment}</td><td>${item.score === null ? 'Not graded' : item.score}</td><td>${new Date(item.submitted_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">No tasks submitted yet.</p>';
  } catch (error) { location.href = '/login/'; }
}

async function completeLesson(lessonId) {
  try {
    await request('lesson-completions/', {method: 'POST', body: JSON.stringify({lesson: lessonId})});
    loadStudentDashboard();
  } catch (error) { alert(error.message); }
}

function toggleAdminTaskForm() {
  document.querySelector('#admin-task-form')?.classList.toggle('hidden');
}

async function createAdminTask(event) {
  event.preventDefault();
  const messageBox = document.querySelector('#admin-task-message');
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.due_date = new Date(values.due_date).toISOString();
    await request('assignments/', {method: 'POST', body: JSON.stringify(values)});
    event.currentTarget.reset();
    toggleAdminTaskForm();
    messageBox.textContent = 'Task created and course progress has been recalculated.';
    loadAdminDashboard();
  } catch (error) { messageBox.textContent = error.message; }
}

async function populateAdminTaskCourses() {
  const select = document.querySelector('#admin-task-course');
  if (!select) return;
  try {
    const data = await request('courses/');
    const courses = data.results || data;
    select.innerHTML = '<option value="">Select a course</option>' + courses.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
  } catch (error) { select.innerHTML = '<option value="">Unable to load courses</option>'; }
}

if (document.querySelector('#admin-task-form')) {
  document.querySelector('#admin-task-form').addEventListener('submit', createAdminTask);
  populateAdminTaskCourses();
}

async function loadStudentDashboard() {
  try {
    const user = await profile();
    if (user.is_staff || user.is_instructor) { location.href = user.is_staff ? '/dashboard/admin/' : '/dashboard/instructor/'; return; }
    setNavigation(user);
    document.querySelector('#welcome').textContent = `Welcome, ${user.first_name || user.username}`;
    const response = await request('enrollments/');
    const enrollments = response.results || response;
    document.querySelector('#enrollment-list').innerHTML = enrollments.length
      ? enrollments.map(item => `<article class="card course-card"><span class="tag">${item.status}</span><h3>${item.course_title}</h3><p class="course-progress">Progress: ${item.progress}%</p><div class="progress-track"><div class="progress-value" style="width:${item.progress}%"></div></div><p><a class="button small" href="/courses/${item.course}/">Open course</a></p></article>`).join('')
      : '<p>You have not enrolled in a course yet. Visit <a href="/">Courses</a> to enroll.</p>';
  } catch (error) { location.href = '/login/'; }
}

async function loadCourseDetail(courseId) {
  const overview = document.querySelector('#course-overview');
  if (!overview) return;
  try {
    const course = await request(`courses/${courseId}/`);
    const user = token() ? await profile() : null;
    const enrollmentResponse = user ? await request('enrollments/') : [];
    const enrollments = enrollmentResponse.results || enrollmentResponse;
    const enrollment = enrollments.find(item => item.course === courseId);
    const isStudent = user && !user.is_instructor && !user.is_staff;
    overview.innerHTML = `<article class="card course-overview-card"><span class="tag">${course.code}</span><h1>${course.title}</h1><p>${course.description}</p>${instructorMarkup(course)}${enrollment ? `<p class="course-progress">Your progress: ${enrollment.progress}%</p><div class="progress-track"><div class="progress-value" style="width:${enrollment.progress}%"></div></div>` : (isStudent ? `<p><button class="button small" onclick="enroll(${course.id})">Enroll in this course</button></p>` : '<p>Please log in as an enrolled student to access course content.</p>')}</article>`;
    if (!enrollment || !isStudent) return;
    document.querySelector('#course-learning-content').classList.remove('hidden');
    const [lessonResponse, assignmentResponse, completionResponse, submissionResponse] = await Promise.all([request('lessons/'), request('assignments/'), request('lesson-completions/'), request('submissions/')]);
    const lessons = (lessonResponse.results || lessonResponse).filter(item => item.course === courseId);
    const assignments = (assignmentResponse.results || assignmentResponse).filter(item => item.course === courseId);
    const completed = new Set((completionResponse.results || completionResponse).map(item => item.lesson));
    const submissions = (submissionResponse.results || submissionResponse).filter(item => assignments.some(task => task.id === item.assignment));
    document.querySelector('#course-lessons').innerHTML = lessons.length ? lessons.map(item => `<article class="card"><span class="tag">Class ${item.position}</span><h3>${item.title}</h3><p>${item.content || 'No written class content.'}</p>${item.video_url ? `<p><a href="${item.video_url}" target="_blank">Watch class</a></p>` : ''}${completed.has(item.id) ? '<span class="completed-lesson">Completed</span>' : `<button class="button small" onclick="completeCourseLesson(${item.id}, ${courseId})">Mark class complete</button>`}</article>`).join('') : '<p>No classes are available for this course.</p>';
    document.querySelector('#course-assignments').innerHTML = assignments.length ? assignments.map(item => { const submitted = submissions.some(submission => submission.assignment === item.id); return `<article class="card"><span class="tag">Due ${new Date(item.due_date).toLocaleDateString()}</span><h3>${item.title}</h3><p>${item.instructions}</p>${item.test_link ? `<p><a href="${item.test_link}" target="_blank">Open task link</a></p>` : ''}${submitted ? '<span class="completed-lesson">Task submitted</span>' : `<form class="course-task-form" data-assignment="${item.id}"><textarea name="content" placeholder="Write your task response" required></textarea><button class="button small">Submit task</button></form>`}</article>`; }).join('') : '<p>No tasks are available for this course.</p>';
    document.querySelectorAll('.course-task-form').forEach(form => form.addEventListener('submit', event => submitCourseTask(event, courseId)));
    document.querySelector('#course-submissions').innerHTML = submissions.length ? `<table><thead><tr><th>Task</th><th>Score</th><th>Submitted</th></tr></thead><tbody>${submissions.map(item => `<tr><td>${assignments.find(task => task.id === item.assignment)?.title || 'Task'}</td><td>${item.score === null ? 'Not graded' : item.score}</td><td>${new Date(item.submitted_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">No tasks submitted in this course yet.</p>';
  } catch (error) { overview.innerHTML = `<p>${error.message}</p>`; }
}

async function completeCourseLesson(lessonId, courseId) {
  try { await request('lesson-completions/', {method: 'POST', body: JSON.stringify({lesson: lessonId})}); loadCourseDetail(courseId); }
  catch (error) { alert(error.message); }
}

async function submitCourseTask(event, courseId) {
  event.preventDefault();
  try { const form = new FormData(event.currentTarget); form.append('assignment', event.currentTarget.dataset.assignment); await request('submissions/', {method: 'POST', body: form}); loadCourseDetail(courseId); }
  catch (error) { alert(error.message); }
}

async function loadCourses(search = '') {
  const courseList = document.querySelector('#course-list');
  if (!courseList) return;
  try {
    const courseResponse = await request(`courses/?search=${encodeURIComponent(search)}`);
    const courses = courseResponse.results || courseResponse;
    let enrolledCourseIds = new Set();
    if (token()) {
      try {
        const enrollmentResponse = await request('enrollments/');
        const enrollments = enrollmentResponse.results || enrollmentResponse;
        enrolledCourseIds = new Set(enrollments.map(item => item.course));
      } catch (error) { /* Visitors can still browse the public catalogue. */ }
    }
    courseList.innerHTML = courses.length
      ? courses.map(course => {
          const enrolled = enrolledCourseIds.has(course.id);
          const action = enrolled
            ? `<a class="button small" href="/courses/${course.id}/">Enrolled · Open course</a>`
            : `<button class="button small" onclick="enroll(${course.id})">Enroll now</button>`;
          return `<article class="card"><span class="tag">${course.code}</span><h3>${course.title}</h3><p>${course.description}</p>${instructorMarkup(course)}<p><a class="course-details-link" href="/courses/${course.id}/">View course details</a></p>${action}</article>`;
        }).join('')
      : '<p>No courses found.</p>';
  } catch (error) { courseList.textContent = error.message; }
}

async function editCourse(courseId) {
  try {
    const course = await request(`courses/${courseId}/`);
    let panel = document.querySelector('#course-edit-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'course-edit-panel';
      panel.className = 'edit-panel';
      document.querySelector('#instructor-course-list')?.after(panel);
    }
    panel.innerHTML = `<div class="section-heading"><h2>Edit course</h2><button class="link-button" type="button" onclick="closeCourseEdit()">Cancel</button></div><form id="course-edit-form" class="inline-form"><input type="hidden" name="id" value="${course.id}"><label>Course title<input name="title" value="${course.title}" required></label><label>Course code<input name="code" value="${course.code}" required></label><label>Description<input name="description" value="${course.description}" required></label><label>Status<select name="status"><option value="draft" ${course.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${course.status === 'published' ? 'selected' : ''}>Published</option></select></label><button class="button small" type="submit">Save changes</button></form><p class="form-message" id="course-edit-message"></p>`;
    panel.querySelector('#course-edit-form').addEventListener('submit', saveCourseEdit);
    panel.scrollIntoView({behavior: 'smooth', block: 'center'});
  } catch (error) { alert(error.message); }
}

function closeCourseEdit() {
  document.querySelector('#course-edit-panel')?.remove();
}

async function saveCourseEdit(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const courseId = values.id;
  delete values.id;
  const messageBox = document.querySelector('#course-edit-message');
  try {
    await request(`courses/${courseId}/`, {method: 'PATCH', body: JSON.stringify(values)});
    messageBox.textContent = 'Course updated successfully. Students will see the change immediately.';
    loadInstructorDashboard();
  } catch (error) { messageBox.textContent = error.message; }
}

async function editCourseLesson(lessonId, courseId) {
  try {
    const lesson = await request(`lessons/${lessonId}/`);
    const card = document.querySelector(`#lesson-card-${lessonId}`);
    card.insertAdjacentHTML('beforeend', `<form class="inline-form compact-edit" id="lesson-edit-form-${lessonId}"><label>Title<input name="title" value="${escapeFormValue(lesson.title)}" required></label><label>Position<input name="position" type="number" min="1" value="${lesson.position}" required></label><label>Video URL<input name="video_url" type="url" value="${escapeFormValue(lesson.video_url)}"></label><label>Content<textarea name="content" required>${escapeFormValue(lesson.content)}</textarea></label><label><input name="is_published" type="checkbox" ${lesson.is_published ? 'checked' : ''}> Publish for students</label><button class="button small">Save class</button><button class="link-button" type="button" onclick="loadInstructorCourse(${courseId})">Cancel</button></form>`);
    const form = document.querySelector(`#lesson-edit-form-${lessonId}`);
    form.onsubmit = event => saveCourseLesson(event, lessonId, courseId);
  } catch (error) { alert(error.message); }
}

async function saveCourseLesson(event, lessonId, courseId) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.is_published = form.elements.is_published.checked;
    await request(`lessons/${lessonId}/`, {method: 'PATCH', body: JSON.stringify(values)});
    loadInstructorCourse(courseId);
  } catch (error) { alert(error.message); }
}

async function editCourseTask(taskId, courseId) {
  try {
    const task = await request(`assignments/${taskId}/`);
    const dueDate = new Date(task.due_date).toISOString().slice(0, 16);
    const card = document.querySelector(`#task-card-${taskId}`);
    card.insertAdjacentHTML('beforeend', `<form class="inline-form compact-edit" id="task-edit-form-${taskId}"><label>Title<input name="title" value="${escapeFormValue(task.title)}" required></label><label>Due date<input name="due_date" type="datetime-local" value="${dueDate}" required></label><label>Maximum marks<input name="max_marks" type="number" min="1" value="${task.max_marks}" required></label><label>Test link<input name="test_link" type="url" value="${escapeFormValue(task.test_link)}"></label><label>Instructions<textarea name="instructions" required>${escapeFormValue(task.instructions)}</textarea></label><button class="button small">Save task</button><button class="link-button" type="button" onclick="loadInstructorCourse(${courseId})">Cancel</button></form>`);
    const form = document.querySelector(`#task-edit-form-${taskId}`);
    form.onsubmit = event => saveCourseTask(event, taskId, courseId);
  } catch (error) { alert(error.message); }
}

async function saveCourseTask(event, taskId, courseId) {
  event.preventDefault();
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.due_date = new Date(values.due_date).toISOString();
    await request(`assignments/${taskId}/`, {method: 'PATCH', body: JSON.stringify(values)});
    loadInstructorCourse(courseId);
  } catch (error) { alert(error.message); }
}

async function loadInstructorDashboard() {
  try {
    const user = await profile();
    if (!user.is_instructor || user.is_staff) { location.href = user.is_staff ? '/dashboard/admin/' : '/dashboard/student/'; return; }
    setNavigation(user);
    document.querySelector('#welcome').textContent = `Welcome, ${user.first_name || user.username}`;
    const response = await request('courses/');
    const courses = (response.results || response).filter(course => course.instructor_name === user.username);
    document.querySelector('#instructor-course-list').innerHTML = courses.length
      ? courses.map(course => `<article class="card course-card"><span class="tag">${course.status}</span><h3>${course.title}</h3><p>${course.description}</p><p><a class="button small" href="/instructor/courses/${course.id}/">Open course</a></p></article>`).join('')
      : '<p>You have not created courses yet.</p>';
  } catch (error) { location.href = '/login/'; }
}

async function loadInstructorCourse(courseId) {
  const overview = document.querySelector('#instructor-course-overview');
  if (!overview) return;
  try {
    const user = await profile();
    const [course, lessonResponse, taskResponse, submissionResponse] = await Promise.all([
      request(`courses/${courseId}/`), request('lessons/'), request('assignments/'), request('submissions/')
    ]);
    if (!user.is_instructor || user.is_staff || course.instructor_name !== user.username) {
      location.href = '/dashboard/instructor/'; return;
    }
    setNavigation(user);
    overview.innerHTML = `<p class="eyebrow">COURSE MANAGEMENT</p><div class="dashboard-title-row"><div><h1>${course.title}</h1><p class="page-description">${course.description}</p></div><button class="button small" onclick="editCourse(${course.id})">Edit course details</button></div>`;
    const lessons = (lessonResponse.results || lessonResponse).filter(item => item.course === courseId);
    const tasks = (taskResponse.results || taskResponse).filter(item => item.course === courseId);
    const taskNames = new Map(tasks.map(item => [item.id, item.title]));
    document.querySelector('#instructor-course-lessons').innerHTML = lessons.length
      ? lessons.map(item => `<article class="card" id="lesson-card-${item.id}"><span class="tag">Class ${item.position}</span><h3>${item.title}</h3><p>${item.content}</p><p>${item.is_published ? '<span class="completed-lesson">Published</span>' : 'Draft'}</p><button class="button small" onclick="editCourseLesson(${item.id}, ${courseId})">Edit class</button></article>`).join('')
      : '<p>No classes have been added yet.</p>';
    document.querySelector('#instructor-course-tasks').innerHTML = tasks.length
      ? tasks.map(item => `<article class="card" id="task-card-${item.id}"><span class="tag">Task</span><h3>${item.title}</h3><p>${item.instructions}</p><p>Due: ${new Date(item.due_date).toLocaleDateString()} · ${item.max_marks} marks</p>${item.test_link ? `<a href="${item.test_link}" target="_blank">Open task link</a>` : ''}<p><button class="button small" onclick="editCourseTask(${item.id}, ${courseId})">Edit task</button></p></article>`).join('')
      : '<p>No tasks have been added yet.</p>';
    const submissions = (submissionResponse.results || submissionResponse)
      .filter(item => tasks.some(task => task.id === item.assignment));
    document.querySelector('#instructor-course-submissions').innerHTML = submissions.length
      ? `<table><thead><tr><th>Student</th><th>Task</th><th>Response</th><th>Score</th><th>Action</th></tr></thead><tbody>${submissions.map(item => `<tr><td>Student #${item.student}</td><td>${taskNames.get(item.assignment) || 'Task'}</td><td class="submission-response">${item.content || 'File submission'}</td><td>${item.score === null ? 'Not graded' : item.score}</td><td><button class="button small" onclick="gradeSubmission(${item.id})">Grade</button></td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">No student submissions for this course yet.</p>';
    document.querySelector('#course-lesson-form').onsubmit = event => createCourseLesson(event, courseId);
    document.querySelector('#course-task-form').onsubmit = event => createCourseTask(event, courseId);
  } catch (error) { overview.innerHTML = `<p>${error.message}</p>`; }
}

async function createCourseLesson(event, courseId) {
  event.preventDefault();
  const messageBox = document.querySelector('#lesson-form-message');
  try {
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.course = courseId;
    values.is_published = form.elements.is_published.checked;
    await request('lessons/', {method: 'POST', body: JSON.stringify(values)});
    form.reset(); form.elements.position.value = 1; form.elements.is_published.checked = true;
    messageBox.textContent = 'Class added successfully.';
    loadInstructorCourse(courseId);
  } catch (error) { messageBox.textContent = error.message; }
}

async function createCourseTask(event, courseId) {
  event.preventDefault();
  const messageBox = document.querySelector('#task-form-message');
  try {
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.course = courseId;
    values.due_date = new Date(values.due_date).toISOString();
    await request('assignments/', {method: 'POST', body: JSON.stringify(values)});
    form.reset(); form.elements.max_marks.value = 100;
    messageBox.textContent = 'Task added successfully. It is visible to enrolled students.';
    loadInstructorCourse(courseId);
  } catch (error) { messageBox.textContent = error.message; }
}

async function gradeSubmission(submissionId) {
  const score = prompt('Enter score:');
  if (score === null) return;
  const feedback = prompt('Enter feedback:') || '';
  try {
    await request(`submissions/${submissionId}/`, {method: 'PATCH', body: JSON.stringify({score: Number(score), feedback})});
    alert('Grade saved.');
    const coursePage = document.querySelector('#instructor-course-page');
    if (coursePage) loadInstructorCourse(Number(coursePage.dataset.courseId));
    else loadInstructorDashboard();
  } catch (error) { alert(error.message); }
}

function escapeFormValue(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function editCourse(courseId) {
  try {
    const course = await request(`courses/${courseId}/`);
    let panel = document.querySelector('#course-edit-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'course-edit-panel';
      panel.className = 'edit-panel';
      const coursePageOverview = document.querySelector('#instructor-course-overview');
      const courseList = document.querySelector('#instructor-course-list');
      if (coursePageOverview) coursePageOverview.after(panel);
      else if (courseList) courseList.after(panel);
      else throw new Error('Unable to open the course edit form.');
    }
    panel.innerHTML = `<div class="section-heading"><h2>Edit course details</h2><button class="link-button" type="button" onclick="closeCourseEdit()">Cancel</button></div><form id="course-edit-form" class="inline-form"><input type="hidden" name="id" value="${course.id}"><label>Course title<input name="title" value="${escapeFormValue(course.title)}" required></label><label>Course code<input name="code" value="${escapeFormValue(course.code)}" required></label><label>Description<textarea name="description" required>${escapeFormValue(course.description)}</textarea></label><label>Status<select name="status"><option value="draft" ${course.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${course.status === 'published' ? 'selected' : ''}>Published</option></select></label><button class="button small" type="submit">Save changes</button></form><p class="form-message" id="course-edit-message"></p>`;
    panel.querySelector('#course-edit-form').onsubmit = saveCourseEdit;
    panel.scrollIntoView({behavior: 'smooth', block: 'center'});
  } catch (error) { alert(error.message); }
}

async function saveCourseEdit(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const courseId = Number(values.id);
  delete values.id;
  const messageBox = document.querySelector('#course-edit-message');
  try {
    await request(`courses/${courseId}/`, {method: 'PATCH', body: JSON.stringify(values)});
    messageBox.textContent = 'Course updated successfully.';
    const coursePage = document.querySelector('#instructor-course-page');
    if (coursePage) loadInstructorCourse(courseId);
    else loadInstructorDashboard();
  } catch (error) { messageBox.textContent = error.message; }
}
