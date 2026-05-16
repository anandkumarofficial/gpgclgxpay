// =============================================
//  GP GONDA v2 — script.js
//  Register / Login / Forgot Password
// =============================================

// ── JSONBin Config ─────────────────────────
var BIN_ID  = '6a07f6fac0954111d82ee279';
var API_KEY = '$2a$10$ntQbtOWUeUX0nQqmVNx5/.SmTfpLHr4.X4I2ILQ7aTEtD5/NhMybW';
var BIN_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

// ── JSONBin: Read users ────────────────────
function fetchUsers(cb) {
  fetch(BIN_URL + '/latest', { headers:{'X-Access-Key':API_KEY} })
  .then(function(r){ return r.json(); })
  .then(function(d){
    var data = d.record || {};
    cb(null, data.users || []);
  })
  .catch(function(e){ cb(e,[]); });
}

// ── JSONBin: Write users ───────────────────
function saveUsers(users, cb) {
  // First fetch full record so we don't overwrite events
  fetch(BIN_URL + '/latest', { headers:{'X-Access-Key':API_KEY} })
  .then(function(r){ return r.json(); })
  .then(function(d){
    var record = d.record || {};
    record.users = users;
    return fetch(BIN_URL, {
      method:'PUT',
      headers:{'Content-Type':'application/json','X-Access-Key':API_KEY},
      body:JSON.stringify(record)
    });
  })
  .then(function(r){ return r.json(); })
  .then(function(){ if(cb) cb(null); })
  .catch(function(e){ if(cb) cb(e); });
}

// ── Simple hash (not cryptographic — basic obfuscation) ──
function hashPass(str) {
  var hash = 0;
  for(var i=0;i<str.length;i++){
    hash = ((hash<<5)-hash)+str.charCodeAt(i);
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36) + str.length;
}

// ── Escape HTML ─────────────────────────────
function esc(s){
  var d=document.createElement('div');
  d.appendChild(document.createTextNode(String(s)));
  return d.innerHTML;
}

// ── Toast ─────────────────────────────────
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type==='error'?' error':'');
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

  // ── Tab switch ──────────────────────────
  window.switchTab = function(tab) {
    var slider = document.getElementById('tabSlider');
    var regCard = document.getElementById('registerCard');
    var logCard = document.getElementById('loginCard');
    var tabReg  = document.getElementById('tabRegister');
    var tabLog  = document.getElementById('tabLogin');

    if(tab === 'register'){
      slider.style.left = '5px';
      tabReg.classList.add('active');
      tabLog.classList.remove('active');
      regCard.style.display = 'block';
      logCard.style.display = 'none';
    } else {
      slider.style.left = 'calc(50%)';
      tabLog.classList.add('active');
      tabReg.classList.remove('active');
      logCard.style.display = 'block';
      regCard.style.display = 'none';
    }
  };

  // ── Password visibility toggle ─────────
  window.togglePass = function(id, btn) {
    var inp = document.getElementById(id);
    if(inp.type === 'password'){
      inp.type = 'text'; btn.textContent = '🙈';
    } else {
      inp.type = 'password'; btn.textContent = '👁';
    }
  };

  // ── Field helper ───────────────────────
  function setF(inputId, errId, msg) {
    var inp=document.getElementById(inputId);
    var err=document.getElementById(errId);
    if(!inp||!err) return;
    err.textContent = msg;
    if(msg){ inp.classList.add('err'); inp.classList.remove('ok'); }
    else   { inp.classList.remove('err'); inp.classList.add('ok'); }
  }

  function clearF(inputId, errId){
    var inp=document.getElementById(inputId);
    var err=document.getElementById(errId);
    if(inp){ inp.classList.remove('err','ok'); }
    if(err){ err.textContent=''; }
  }

  // ─────────────────────────────────────────
  //  REGISTER
  // ─────────────────────────────────────────
  var FIELDS_TOTAL = 9;
  var fieldIds = ['rName','rBranch','rEnroll','rPhone','rPass','rQ1','rQ2','rQ3'];

  function updateProgress(){
    var filled = 0;
    if(document.getElementById('rName').value.trim())   filled++;
    if(document.getElementById('rBranch').value)        filled++;
    if(document.getElementById('rEnroll').value.trim()) filled++;
    if(document.getElementById('rPhone').value.trim())  filled++;
    if(document.getElementById('rPass').value)          filled++;
    if(document.getElementById('rQ1').value.trim())     filled++;
    if(document.getElementById('rQ2').value.trim())     filled++;
    if(document.getElementById('rQ3').value.trim())     filled++;
    var pct = Math.round((filled/8)*100);
    document.getElementById('regProgress').style.width  = pct+'%';
    document.getElementById('regProgressLabel').textContent = filled+' / 8 filled';
  }

  fieldIds.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', updateProgress);
    if(el) el.addEventListener('change', updateProgress);
  });

  // Password strength
  var rPass = document.getElementById('rPass');
  if(rPass) rPass.addEventListener('input', function(){
    var v=this.value, score=0;
    if(v.length>=8) score++;
    if(/[A-Z]/.test(v)) score++;
    if(/[0-9]/.test(v)) score++;
    if(/[^a-zA-Z0-9]/.test(v)) score++;
    var bar = document.getElementById('psBar');
    var colors = ['#ff5c5c','#ffb347','#e8b84b','#3ddc84'];
    var widths = ['25%','50%','75%','100%'];
    bar.style.width     = v.length ? widths[score-1]||'15%' : '0%';
    bar.style.background= v.length ? colors[score-1]||'#ff5c5c' : '';
  });

  // Enrollment auto-uppercase
  var rEnroll = document.getElementById('rEnroll');
  if(rEnroll) rEnroll.addEventListener('input', function(){
    var pos=this.selectionStart; this.value=this.value.toUpperCase(); this.setSelectionRange(pos,pos);
    updateProgress();
  });

  // Validation
  function vName(v)   { v=v.trim(); if(!v) return 'Name is required'; if(v.length<3) return 'At least 3 characters'; if(!/^[a-zA-Z\s]+$/.test(v)) return 'Letters only'; return ''; }
  function vBranch(v) { return v?'':'Please select your branch'; }
  function vEnroll(v) {
    v=v.trim();
    if(!v)           return 'Enrollment number is required';
    if(v.length<15)  return 'Too short — exactly 15 characters (e.g. E23220932900034)';
    if(v.length>15)  return 'Too long — exactly 15 characters';
    if(!/^[A-Z]\d{14}$/.test(v)) return 'Format: 1 letter + 14 digits (e.g. E23220932900034)';
    return '';
  }
  function vPhone(v) {
    v=v.trim();
    if(!v) return 'Phone number is required';
    if(!/^[6-9]\d{9}$/.test(v)) return 'Enter valid 10-digit Indian mobile number';
    return '';
  }
  function vPass(v) {
    if(!v)          return 'Password is required';
    if(v.length<6)  return 'At least 6 characters';
    return '';
  }
  function vAns(v) { v=v.trim(); return v?'':'This answer is required'; }

  var regForm = document.getElementById('registerForm');
  if(regForm) regForm.addEventListener('submit', function(e){
    e.preventDefault();

    var name    = document.getElementById('rName').value;
    var branch  = document.getElementById('rBranch').value;
    var enroll  = document.getElementById('rEnroll').value;
    var phone   = document.getElementById('rPhone').value;
    var pass    = document.getElementById('rPass').value;
    var q1      = document.getElementById('rQ1').value;
    var q2      = document.getElementById('rQ2').value;
    var q3      = document.getElementById('rQ3').value;

    var ne=vName(name), be=vBranch(branch), ee=vEnroll(enroll),
        pe=vPhone(phone), pe2=vPass(pass),
        qe1=vAns(q1), qe2=vAns(q2), qe3=vAns(q3);

    setF('rName','rerr-name',ne);
    setF('rBranch','rerr-branch',be);
    setF('rEnroll','rerr-enroll',ee);
    setF('rPhone','rerr-phone',pe);
    setF('rPass','rerr-pass',pe2);
    setF('rQ1','rerr-q1',qe1);
    setF('rQ2','rerr-q2',qe2);
    setF('rQ3','rerr-q3',qe3);

    if(ne||be||ee||pe||pe2||qe1||qe2||qe3){
      shake('registerCard'); return;
    }

    // Disable button, show loader
    var btn = document.getElementById('regBtn');
    setBtnLoading(btn, true);

    // Check if enrollment already exists
    fetchUsers(function(err, users){
      if(err){ showToast('Connection error. Try again.','error'); setBtnLoading(btn,false); return; }

      var exists = users.find(function(u){ return u.enrollment.toUpperCase()===enroll.trim().toUpperCase(); });
      if(exists){
        setF('rEnroll','rerr-enroll','This enrollment number is already registered!');
        shake('registerCard'); setBtnLoading(btn,false); return;
      }

      var newUser = {
        id:         Date.now(),
        name:       name.trim(),
        branch:     branch,
        enrollment: enroll.trim().toUpperCase(),
        phone:      phone.trim(),
        password:   hashPass(pass),
        security: {
          q1: q1.trim().toLowerCase(),
          q2: q2.trim().toLowerCase(),
          q3: q3.trim().toLowerCase()
        },
        registeredAt: new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
      };

      users.push(newUser);
      saveUsers(users, function(err2){
        if(err2){ showToast('Could not save. Try again.','error'); setBtnLoading(btn,false); return; }

        // Save to localStorage for session
        localStorage.setItem('gpg_current_user', JSON.stringify(newUser));

        setBtnLoading(btn,false);
        showSuccessOverlay('Registration Successful!', 'Welcome, '+newUser.name+'!');
      });
    });
  });

  // ─────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────
  var lEnroll = document.getElementById('lEnroll');
  if(lEnroll) lEnroll.addEventListener('input', function(){
    var pos=this.selectionStart; this.value=this.value.toUpperCase(); this.setSelectionRange(pos,pos);
  });

  var loginForm = document.getElementById('loginForm');
  if(loginForm) loginForm.addEventListener('submit', function(e){
    e.preventDefault();

    var enroll = document.getElementById('lEnroll').value.trim().toUpperCase();
    var pass   = document.getElementById('lPass').value;

    var ee = vEnroll(enroll);
    var pe = vPass(pass);
    setF('lEnroll','lerr-enroll',ee);
    setF('lPass','lerr-pass',pe);
    if(ee||pe){ shake('loginCard'); return; }

    var btn = document.getElementById('loginBtn');
    setBtnLoading(btn,true);

    fetchUsers(function(err, users){
      if(err){ showToast('Connection error. Try again.','error'); setBtnLoading(btn,false); return; }

      var user = users.find(function(u){ return u.enrollment.toUpperCase()===enroll; });
      if(!user){
        setF('lEnroll','lerr-enroll','Enrollment number not found. Please register first.');
        shake('loginCard'); setBtnLoading(btn,false); return;
      }
      if(user.password !== hashPass(pass)){
        setF('lPass','lerr-pass','Incorrect password.');
        shake('loginCard'); setBtnLoading(btn,false); return;
      }

      localStorage.setItem('gpg_current_user', JSON.stringify(user));
      setBtnLoading(btn,false);
      showSuccessOverlay('Welcome Back!', 'Signed in as '+user.name);
    });
  });

  // ─────────────────────────────────────────
  //  FORGOT PASSWORD
  // ─────────────────────────────────────────
  var _forgotUser = null;

  window.showForgot = function(){
    document.getElementById('forgotOverlay').classList.add('open');
    document.body.style.overflow='hidden';
    // Reset steps
    document.getElementById('forgotStepA').style.display='block';
    document.getElementById('forgotStepB').style.display='none';
    document.getElementById('forgotStepC').style.display='none';
    document.getElementById('fEnroll').value='';
    _forgotUser=null;
  };
  window.closeForgot = function(){
    document.getElementById('forgotOverlay').classList.remove('open');
    document.body.style.overflow='';
  };

  // Step 1 — find account
  window.forgotStep1 = function(){
    var enroll = document.getElementById('fEnroll').value.trim().toUpperCase();
    var ee = vEnroll(enroll);
    setF('fEnroll','ferr-enroll',ee);
    if(ee){ shake('forgotModal'); return; }

    fetchUsers(function(err,users){
      if(err){ showToast('Connection error.','error'); return; }
      var user=users.find(function(u){ return u.enrollment.toUpperCase()===enroll; });
      if(!user){ setF('fEnroll','ferr-enroll','No account found with this enrollment number.'); shake('forgotModal'); return; }
      _forgotUser=user;
      document.getElementById('forgotStepA').style.display='none';
      document.getElementById('forgotStepB').style.display='block';
    });
  };

  // Step 2 — verify security answers
  window.forgotStep2 = function(){
    if(!_forgotUser) return;
    var a1=document.getElementById('fQ1').value.trim().toLowerCase();
    var a2=document.getElementById('fQ2').value.trim().toLowerCase();
    var a3=document.getElementById('fQ3').value.trim().toLowerCase();

    var e1=a1?'':'Answer required', e2=a2?'':'Answer required', e3=a3?'':'Answer required';
    setF('fQ1','ferr-fq1',e1); setF('fQ2','ferr-fq2',e2); setF('fQ3','ferr-fq3',e3);
    if(e1||e2||e3){ shake('forgotModal'); return; }

    var sec=_forgotUser.security;
    if(a1!==sec.q1||a2!==sec.q2||a3!==sec.q3){
      showToast('Answers do not match. Please try again.','error');
      shake('forgotModal'); return;
    }
    document.getElementById('forgotStepB').style.display='none';
    document.getElementById('forgotStepC').style.display='block';
  };

  // Step 3 — reset password
  window.forgotStep3 = function(){
    if(!_forgotUser) return;
    var np=document.getElementById('fNewPass').value;
    var pe=vPass(np);
    setF('fNewPass','ferr-newpass',pe);
    if(pe){ shake('forgotModal'); return; }

    fetchUsers(function(err,users){
      if(err){ showToast('Connection error.','error'); return; }
      var idx=users.findIndex(function(u){ return u.enrollment===_forgotUser.enrollment; });
      if(idx===-1){ showToast('User not found.','error'); return; }
      users[idx].password=hashPass(np);
      saveUsers(users,function(err2){
        if(err2){ showToast('Could not save. Try again.','error'); return; }
        closeForgot();
        showToast('Password reset successfully!');
        _forgotUser=null;
        switchTab('login');
      });
    });
  };

  // ─────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────
  function setBtnLoading(btn, loading){
    if(!btn) return;
    btn.disabled=loading;
    var t=btn.querySelector('.auth-btn-text'), a=btn.querySelector('.auth-btn-arrow'), l=btn.querySelector('.auth-btn-loader');
    if(t) t.style.display=loading?'none':'inline';
    if(a) a.style.display=loading?'none':'inline';
    if(l) l.style.display=loading?'inline':'none';
  }

  function shake(id){
    var el=document.getElementById(id); if(!el) return;
    [-7,7,-5,5,-3,3,0].forEach(function(m,i){
      setTimeout(function(){ el.style.transform='translateX('+m+'px)'; },i*55);
    });
  }

  function showSuccessOverlay(title, msg){
    document.getElementById('successTitle').textContent=title;
    document.getElementById('successMsg').textContent=msg;
    document.getElementById('successOverlay').style.display='flex';
  }

  window.goToDashboard = function(){
    // Will go to dashboard page when built
    showToast('Dashboard coming soon!');
    document.getElementById('successOverlay').style.display='none';
  };

  // ── Check if already logged in ──────────
  try {
    var cur = JSON.parse(localStorage.getItem('gpg_current_user'));
    if(cur && cur.name) {
      // Auto-fill login form
      if(document.getElementById('lEnroll')) document.getElementById('lEnroll').value=cur.enrollment;
    }
  } catch(e){}

}); // DOMContentLoaded
