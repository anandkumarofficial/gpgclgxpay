// =============================================
//  GP GONDA – EVENT PAYMENT TRACKER
//  script.js
// =============================================

document.addEventListener('DOMContentLoaded', function () {

  // ── Logo fallback ──────────────────────────
  var logoImg = document.getElementById('logoImg');
  if (logoImg) {
    logoImg.onerror = function () {
      this.style.display = 'none';
      var fb = document.getElementById('logoFallback');
      if (fb) fb.style.display = 'flex';
    };
  }

  // =============================================
  //  SIGNUP FORM
  // =============================================
  function validateName(v) {
    v = v.trim();
    if (!v)                        return 'Name is required';
    if (v.length < 3)              return 'Name must be at least 3 characters';
    if (!/^[a-zA-Z\s]+$/.test(v)) return 'Name should only contain letters';
    return '';
  }
  function validateBranch(v) { return v ? '' : 'Please select your branch'; }
  function validateEnroll(v) {
    v = v.trim();
    if (!v)          return 'Enrollment number is required';
    if (v.length < 15) return 'Too short — must be exactly 15 characters (e.g. E23220932900034)';
    if (v.length > 15) return 'Too long — must be exactly 15 characters (e.g. E23220932900034)';
    if (!/^[A-Z]\d{14}$/.test(v)) return 'Must start with 1 letter then 14 digits (e.g. E23220932900034)';
    return '';
  }

  function setField(inputId, errId, msg) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (!inp || !err) return;
    err.textContent = msg;
    if (msg) { inp.classList.add('error');  inp.classList.remove('valid'); }
    else     { inp.classList.remove('error'); inp.classList.add('valid'); }
  }

  var nameEl   = document.getElementById('studentName');
  var branchEl = document.getElementById('studentBranch');
  var enrollEl = document.getElementById('enrollNo');

  if (nameEl)   nameEl.addEventListener('input',  function () { setField('studentName',   'err-name',   validateName(this.value)); });
  if (branchEl) branchEl.addEventListener('change', function () { setField('studentBranch', 'err-branch', validateBranch(this.value)); });
  if (enrollEl) enrollEl.addEventListener('input',  function () {
    var pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
    setField('enrollNo', 'err-enroll', validateEnroll(this.value));
  });

  var signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ne = validateName(nameEl.value);
      var be = validateBranch(branchEl.value);
      var ee = validateEnroll(enrollEl.value);
      setField('studentName',   'err-name',   ne);
      setField('studentBranch', 'err-branch', be);
      setField('enrollNo',      'err-enroll', ee);
      if (ne || be || ee) { shakeCard('signupCard'); return; }

      var btn = document.getElementById('submitBtn');
      btn.disabled = true;
      document.getElementById('btnText').style.display   = 'none';
      document.getElementById('btnArrow').style.display  = 'none';
      document.getElementById('btnLoader').style.display = 'inline';

      var data = {
        name:       nameEl.value.trim(),
        branch:     branchEl.value,
        enrollment: enrollEl.value.trim().toUpperCase(),
        registeredAt: new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
        paid: false
      };

      setTimeout(function () {
        try {
          var students = JSON.parse(localStorage.getItem('gpg_students') || '[]');
          if (!students.find(function (s) { return s.enrollment === data.enrollment; }))
            students.push(data);
          localStorage.setItem('gpg_students', JSON.stringify(students));
          localStorage.setItem('gpg_current_user', JSON.stringify(data));
        } catch (ex) {}

        document.getElementById('successDetails').innerHTML =
          detailRow('Name', data.name) + detailRow('Branch', data.branch) +
          detailRow('Enrollment', data.enrollment) + detailRow('Registered', data.registeredAt);

        swapCards('signupCard', 'successCard');
      }, 1200);
    });
  }

  var goLogin = document.getElementById('goLogin');
  if (goLogin) goLogin.addEventListener('click', function (e) { e.preventDefault(); alert('Login page coming soon!'); });

  // =============================================
  //  CREATE EVENT MODAL
  // =============================================
  var overlay    = document.getElementById('eventModalOverlay');
  var openBtn    = document.getElementById('openEventModal');
  var closeBtn   = document.getElementById('closeEventModal');
  var saveBtn    = document.getElementById('saveEventBtn');

  var evtName    = document.getElementById('evtName');
  var evtReason  = document.getElementById('evtReason');
  var evtDesc    = document.getElementById('evtDesc');
  var evtAmount  = document.getElementById('evtAmount');
  var evtDate    = document.getElementById('evtDate');

  // Set minimum date to today
  if (evtDate) evtDate.min = new Date().toISOString().split('T')[0];

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (evtName) evtName.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close modal on overlay click
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ── Live validation for event form ──────────
  function validateEvtName(v)   { v=v.trim(); if(!v) return 'Event name is required'; if(v.length<3) return 'At least 3 characters'; return ''; }
  function validateEvtReason(v) { v=v.trim(); if(!v) return 'Reason is required'; if(v.length<5) return 'Please be more specific'; return ''; }
  function validateEvtDesc(v)   { v=v.trim(); if(!v) return 'Description is required'; if(v.length<10) return 'Please write at least 10 characters'; return ''; }
  function validateEvtAmount(v) { v=parseFloat(v); if(!v||isNaN(v)) return 'Amount is required'; if(v<1) return 'Amount must be at least ₹1'; return ''; }
  function validateEvtDate(v)   {
    if(!v) return 'Last date is required';
    if(new Date(v) < new Date(new Date().toDateString())) return 'Date cannot be in the past';
    return '';
  }

  function setModalField(inputId, errId, msg) {
    var inp = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (!inp || !err) return;
    err.textContent = msg;
    if (msg) { inp.classList.add('error');  inp.classList.remove('valid'); }
    else     { inp.classList.remove('error'); inp.classList.add('valid'); }
  }

  // Check if all event fields are valid → enable/disable save button
  function checkEventForm() {
    var allOk =
      !validateEvtName(evtName.value) &&
      !validateEvtReason(evtReason.value) &&
      !validateEvtDesc(evtDesc.value) &&
      !validateEvtAmount(evtAmount.value) &&
      !validateEvtDate(evtDate.value);

    saveBtn.disabled = !allOk;
    document.getElementById('saveEvtText').textContent  = allOk ? 'Save Event' : 'Fill all fields to Save';
    document.getElementById('saveEvtArrow').style.display = allOk ? 'inline' : 'none';
  }

  if (evtName)   evtName.addEventListener('input',   function () { setModalField('evtName',   'merr-ename',  validateEvtName(this.value));   checkEventForm(); });
  if (evtReason) evtReason.addEventListener('input',  function () { setModalField('evtReason', 'merr-reason', validateEvtReason(this.value)); checkEventForm(); });
  if (evtDesc)   evtDesc.addEventListener('input',    function () { setModalField('evtDesc',   'merr-desc',   validateEvtDesc(this.value));   checkEventForm(); });
  if (evtAmount) evtAmount.addEventListener('input',  function () { setModalField('evtAmount', 'merr-amount', validateEvtAmount(this.value)); checkEventForm(); });
  if (evtDate)   evtDate.addEventListener('change',   function () { setModalField('evtDate',   'merr-date',   validateEvtDate(this.value));   checkEventForm(); });

  // ── Save Event ──────────────────────────────
  if (saveBtn) saveBtn.addEventListener('click', function () {
    // Final check
    var errs = [
      validateEvtName(evtName.value),
      validateEvtReason(evtReason.value),
      validateEvtDesc(evtDesc.value),
      validateEvtAmount(evtAmount.value),
      validateEvtDate(evtDate.value)
    ];
    if (errs.some(Boolean)) return;

    // Show loader
    saveBtn.disabled = true;
    document.getElementById('saveEvtText').style.display  = 'none';
    document.getElementById('saveEvtArrow').style.display = 'none';
    document.getElementById('saveEvtLoader').style.display = 'inline';

    var currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem('gpg_current_user')); } catch(e) {}

    var event = {
      id:           Date.now(),
      name:         evtName.value.trim(),
      reason:       evtReason.value.trim(),
      description:  evtDesc.value.trim(),
      amount:       parseFloat(evtAmount.value),
      lastDate:     evtDate.value,
      createdBy:    currentUser ? currentUser.name : 'Anonymous',
      createdAt:    new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    };

    setTimeout(function () {
      // Save to localStorage
      try {
        var events = JSON.parse(localStorage.getItem('gpg_events') || '[]');
        events.unshift(event);
        localStorage.setItem('gpg_events', JSON.stringify(events));
      } catch(e) {}

      // Reset form
      evtName.value = evtReason.value = evtDesc.value = evtAmount.value = evtDate.value = '';
      [evtName, evtReason, evtDesc, evtAmount, evtDate].forEach(function(el){
        el.classList.remove('valid','error');
      });
      document.getElementById('saveEvtText').style.display   = 'inline';
      document.getElementById('saveEvtLoader').style.display = 'none';
      saveBtn.disabled = true;
      document.getElementById('saveEvtText').textContent = 'Fill all fields to Save';

      closeModal();
      renderEvents();
    }, 1000);
  });

  // =============================================
  //  RENDER EVENTS ON HOME PAGE
  // =============================================
  function renderEvents() {
    var grid    = document.getElementById('eventsGrid');
    var noMsg   = document.getElementById('noEventsMsg');
    if (!grid) return;

    var events = [];
    try { events = JSON.parse(localStorage.getItem('gpg_events') || '[]'); } catch(e) {}

    if (!events.length) {
      noMsg.style.display = 'block';
      // Remove old cards
      Array.from(grid.querySelectorAll('.event-card')).forEach(function(c){ c.remove(); });
      return;
    }

    noMsg.style.display = 'none';
    // Remove old cards
    Array.from(grid.querySelectorAll('.event-card')).forEach(function(c){ c.remove(); });

    events.forEach(function (ev) {
      var today    = new Date(new Date().toDateString());
      var lastDate = new Date(ev.lastDate);
      var expired  = lastDate < today;
      var daysLeft = Math.ceil((lastDate - today) / (1000*60*60*24));

      var dateStr  = lastDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
      var dueBadge = expired
        ? '<span class="event-meta-val date-warning">Expired</span>'
        : '<span class="event-meta-val' + (daysLeft <= 3 ? ' date-warning' : '') + '">' + dateStr + (daysLeft <= 3 && !expired ? ' (' + daysLeft + ' days left!)' : '') + '</span>';

      var card = document.createElement('div');
      card.className = 'event-card';
      card.dataset.id = ev.id;
      card.innerHTML =
        '<div class="event-card-badge' + (expired ? ' expired' : '') + '">' + (expired ? 'EXPIRED' : 'ACTIVE') + '</div>' +
        '<div class="event-card-name">' + esc(ev.name) + '</div>' +
        '<div class="event-card-reason">&#9670; ' + esc(ev.reason) + '</div>' +
        '<div class="event-card-desc">' + esc(ev.description) + '</div>' +
        '<div class="event-card-meta">' +
          '<div class="event-meta-row"><span class="event-meta-label">Amount</span><span class="event-meta-val amount">&#8377;' + ev.amount + ' / student</span></div>' +
          '<div class="event-meta-row"><span class="event-meta-label">Last Date</span>' + dueBadge + '</div>' +
        '</div>' +
        '<div class="event-card-footer">' +
          '<span class="event-creator">Created by ' + esc(ev.createdBy) + ' &middot; ' + esc(ev.createdAt) + '</span>' +
          '<button class="event-delete-btn" data-id="' + ev.id + '">Delete</button>' +
        '</div>';

      grid.appendChild(card);
    });

    // Delete buttons
    grid.querySelectorAll('.event-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete this event?')) return;
        var id = parseInt(this.dataset.id);
        try {
          var evs = JSON.parse(localStorage.getItem('gpg_events') || '[]');
          evs = evs.filter(function(e){ return e.id !== id; });
          localStorage.setItem('gpg_events', JSON.stringify(evs));
        } catch(e) {}
        renderEvents();
      });
    });
  }

  // Render on load
  renderEvents();

  // =============================================
  //  HELPERS
  // =============================================
  function detailRow(label, value) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(value));
    return '<div class="detail-row"><span class="detail-label">' + label +
      '</span><span class="detail-val">' + d.innerHTML + '</span></div>';
  }

  function swapCards(hideId, showId) {
    var hide = document.getElementById(hideId);
    var show = document.getElementById(showId);
    hide.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    hide.style.opacity = '0'; hide.style.transform = 'translateY(-20px)';
    setTimeout(function () {
      hide.style.display = 'none';
      show.style.display = 'block';
      show.style.opacity = '0'; show.style.transform = 'translateY(20px)';
      show.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      setTimeout(function () { show.style.opacity = '1'; show.style.transform = 'translateY(0)'; }, 40);
    }, 380);
  }

  function shakeCard(id) {
    var c = document.getElementById(id);
    if (!c) return;
    [-8,8,-6,6,-4,4,0].forEach(function(m, i) {
      setTimeout(function () { c.style.transform = 'translateX(' + m + 'px)'; }, i * 60);
    });
  }

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }
});

function goToDashboard() {
  alert('Dashboard coming soon! Your registration is saved.');
}
