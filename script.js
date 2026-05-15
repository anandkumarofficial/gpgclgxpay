// =============================================
//  GP GONDA – EVENT PAYMENT TRACKER
//  script.js – Signup & Form Logic
// =============================================

document.addEventListener('DOMContentLoaded', function () {

  const form        = document.getElementById('signupForm');
  const submitBtn   = document.getElementById('submitBtn');
  const signupCard  = document.getElementById('signupCard');
  const successCard = document.getElementById('successCard');

  // ---- Input references ----
  const nameInput   = document.getElementById('studentName');
  const branchInput = document.getElementById('studentBranch');
  const enrollInput = document.getElementById('enrollNo');

  // ---- Error span references ----
  const errName   = document.getElementById('err-name');
  const errBranch = document.getElementById('err-branch');
  const errEnroll = document.getElementById('err-enroll');

  // ---- Field group references ----
  const fgName   = document.getElementById('fg-name');
  const fgBranch = document.getElementById('fg-branch');
  const fgEnroll = document.getElementById('fg-enroll');

  // ================================================
  //  VALIDATION FUNCTIONS
  // ================================================

  function validateName(val) {
    val = val.trim();
    if (!val)               return 'Name is required';
    if (val.length < 3)     return 'Name must be at least 3 characters';
    if (val.length > 60)    return 'Name is too long';
    if (!/^[a-zA-Z\s]+$/.test(val)) return 'Name should only contain letters';
    return '';
  }

  function validateBranch(val) {
    if (!val) return 'Please select your branch';
    return '';
  }

  function validateEnroll(val) {
    val = val.trim();
    if (!val)              return 'Enrollment number is required';
    if (val.length < 6)    return 'Enrollment number is too short';
    if (val.length > 20)   return 'Enrollment number is too long';
    if (!/^[a-zA-Z0-9]+$/.test(val)) return 'Only letters and numbers allowed';
    return '';
  }

  // ---- Show or clear error for a field ----
  function setError(fieldGroup, errSpan, input, message) {
    errSpan.textContent = message;
    if (message) {
      input.classList.add('error');
      input.classList.remove('valid');
      fieldGroup.classList.remove('valid');
    } else {
      input.classList.remove('error');
      input.classList.add('valid');
      fieldGroup.classList.add('valid');
    }
  }

  // ================================================
  //  LIVE VALIDATION (as user types / selects)
  // ================================================

  nameInput.addEventListener('input', function () {
    setError(fgName, errName, nameInput, validateName(this.value));
  });

  branchInput.addEventListener('change', function () {
    setError(fgBranch, errBranch, branchInput, validateBranch(this.value));
  });

  enrollInput.addEventListener('input', function () {
    // Auto uppercase enrollment number
    const cursorPos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(cursorPos, cursorPos);
    setError(fgEnroll, errEnroll, enrollInput, validateEnroll(this.value));
  });

  // ================================================
  //  FORM SUBMIT
  // ================================================

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validate all fields on submit
    const nameErr   = validateName(nameInput.value);
    const branchErr = validateBranch(branchInput.value);
    const enrollErr = validateEnroll(enrollInput.value);

    setError(fgName,   errName,   nameInput,   nameErr);
    setError(fgBranch, errBranch, branchInput, branchErr);
    setError(fgEnroll, errEnroll, enrollInput, enrollErr);

    // If any error exists, stop here
    if (nameErr || branchErr || enrollErr) {
      // Shake the card
      signupCard.style.animation = 'none';
      setTimeout(() => {
        signupCard.style.animation = '';
      }, 10);
      shakeCard();
      return;
    }

    // ---- All valid: show loading state ----
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display  = 'none';
    submitBtn.querySelector('.btn-arrow').style.display = 'none';
    submitBtn.querySelector('.btn-loader').style.display = 'inline';

    // ---- Save to localStorage ----
    const studentData = {
      name:       nameInput.value.trim(),
      branch:     branchInput.value,
      enrollment: enrollInput.value.trim().toUpperCase(),
      registeredAt: new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      paid: false
    };

    // Simulate a small delay for realism
    setTimeout(function () {
      saveStudent(studentData);
      showSuccess(studentData);
    }, 1200);
  });

  // ================================================
  //  SAVE STUDENT DATA
  // ================================================

  function saveStudent(data) {
    let students = JSON.parse(localStorage.getItem('gpg_students') || '[]');

    // Check for duplicate enrollment
    const exists = students.find(s =>
      s.enrollment.toUpperCase() === data.enrollment.toUpperCase()
    );

    if (!exists) {
      students.push(data);
      localStorage.setItem('gpg_students', JSON.stringify(students));
    }

    // Save current logged-in student
    localStorage.setItem('gpg_current_user', JSON.stringify(data));
  }

  // ================================================
  //  SHOW SUCCESS STATE
  // ================================================

  function showSuccess(data) {
    // Build detail rows
    const detailsHtml = `
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-val">${escapeHtml(data.name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Branch</span>
        <span class="detail-val">${escapeHtml(data.branch)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Enrollment</span>
        <span class="detail-val">${escapeHtml(data.enrollment)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Registered At</span>
        <span class="detail-val">${escapeHtml(data.registeredAt)}</span>
      </div>
    `;
    document.getElementById('successDetails').innerHTML = detailsHtml;

    // Swap cards with animation
    signupCard.style.opacity = '0';
    signupCard.style.transform = 'translateY(-20px)';
    signupCard.style.transition = 'all 0.4s ease';

    setTimeout(function () {
      signupCard.style.display = 'none';
      successCard.style.display = 'block';
      successCard.style.opacity = '0';
      successCard.style.transform = 'translateY(20px)';
      successCard.style.transition = 'all 0.4s ease';

      setTimeout(function () {
        successCard.style.opacity = '1';
        successCard.style.transform = 'translateY(0)';
      }, 50);
    }, 400);
  }

  // ================================================
  //  SHAKE ANIMATION ON ERROR
  // ================================================

  function shakeCard() {
    signupCard.style.transform = 'translateX(-8px)';
    setTimeout(() => signupCard.style.transform = 'translateX(8px)',  80);
    setTimeout(() => signupCard.style.transform = 'translateX(-6px)', 160);
    setTimeout(() => signupCard.style.transform = 'translateX(6px)',  240);
    setTimeout(() => signupCard.style.transform = 'translateX(0)',    320);
  }

  // ================================================
  //  SIGN IN LINK (placeholder)
  // ================================================

  const goLoginLink = document.getElementById('goLogin');
  if (goLoginLink) {
    goLoginLink.addEventListener('click', function (e) {
      e.preventDefault();
      alert('Login page coming soon! Please register first.');
    });
  }

  // ================================================
  //  AUTO-FILL IF ALREADY REGISTERED
  // ================================================

  const currentUser = localStorage.getItem('gpg_current_user');
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser);
      // If already registered, show a welcome back option
      const welcomeBar = document.createElement('div');
      welcomeBar.style.cssText = `
        background: rgba(240,165,0,0.08);
        border: 1px solid rgba(240,165,0,0.3);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 1.5rem;
        font-size: 0.85rem;
        color: #f0a500;
        font-family: 'JetBrains Mono', monospace;
      `;
      welcomeBar.innerHTML = `Welcome back, ${escapeHtml(user.name)}! <a href="#" onclick="continueAsExisting()" style="color:#ffc233; text-decoration:underline; cursor:pointer;">Continue as this user →</a>`;
      form.insertBefore(welcomeBar, form.firstChild);
    } catch(err) {}
  }

  // ================================================
  //  UTILITY: ESCAPE HTML
  // ================================================

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

});

// ================================================
//  GO TO DASHBOARD (called from success card button)
// ================================================

function goToDashboard() {
  // Dashboard page will be created next
  // For now, show an alert
  alert('Dashboard coming soon! Your registration is saved.');
}

// ================================================
//  CONTINUE AS EXISTING USER
// ================================================

function continueAsExisting() {
  const currentUser = localStorage.getItem('gpg_current_user');
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser);
      const successCard  = document.getElementById('successCard');
      const signupCard   = document.getElementById('signupCard');
      const detailsEl    = document.getElementById('successDetails');

      detailsEl.innerHTML = `
        <div class="detail-row">
          <span class="detail-label">Name</span>
          <span class="detail-val">${user.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Branch</span>
          <span class="detail-val">${user.branch}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Enrollment</span>
          <span class="detail-val">${user.enrollment}</span>
        </div>
      `;

      signupCard.style.display = 'none';
      successCard.style.display = 'block';
    } catch(e) {}
  }
}
