// =============================================
//  GP GONDA v2 — script.js
//  Register / Login / Forgot Password
// =============================================

var BIN_ID  = '6a07f6fac0954111d82ee279';
var API_KEY = '$2a$10$ntQbtOWUeUX0nQqmVNx5/.SmTfpLHr4.X4I2ILQ7aTEtD5/NhMybW';
var BIN_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

// ── Read users from JSONBin ────────────────
function fetchUsers(cb) {
  fetch(BIN_URL + '/latest', { headers: { 'X-Access-Key': API_KEY } })
  .then(function(r){ return r.json(); })
  .then(function(d){ cb(null, (d.record||{}).users || []); })
  .catch(function(e){ cb(e, []); });
}

// ── Write users (keeps events intact) ─────
function saveUsers(users, cb) {
  fetch(BIN_URL + '/latest', { headers: { 'X-Access-Key': API_KEY } })
  .then(function(r){ return r.json(); })
  .then(function(d){
    var rec = d.record || {};
    rec.users = users;
    return fetch(BIN_URL, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', 'X-Access-Key': API_KEY },
      body: JSON.stringify(rec)
    });
  })
  .then(function(r){ return r.json(); })
  .then(function(){ if(cb) cb(null); })
  .catch(function(e){ if(cb) cb(e); });
}

// ── Basic password hash ────────────────────
function hashPass(str) {
  var h = 0;
  for(var i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
  return 'h'+Math.abs(h).toString(36)+str.length;
}

// ── Toast ──────────────────────────────────
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type==='err' ? ' err' : '');
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

// ── Shake ──────────────────────────────────
function shake(id) {
  var el = document.getElementById(id); if(!el) return;
  [-7,7,-5,5,-3,3,0].forEach(function(m,i){
    setTimeout(function(){ el.style.transform='translateX('+m+'px)'; }, i*55);
  });
}

// ── Field state ────────────────────────────
function setF(inpId, errId, msg) {
  var inp=document.getElementById(inpId), err=document.getElementById(errId);
  if(!inp||!err) return;
  err.textContent = msg;
  if(msg){ inp.classList.add('err'); inp.classList.remove('ok'); }
  else   { inp.classList.remove('err'); inp.classList.add('ok'); }
}

// ── Button loading state ───────────────────
function setBtnLoad(btn, on) {
  btn.disabled = on;
  var t=btn.querySelector('.btn-txt'), a=btn.querySelector('.btn-arr'), l=btn.querySelector('.btn-ld');
  if(t) t.style.display = on?'none':'inline';
  if(a) a.style.display = on?'none':'inline';
  if(l) l.style.display = on?'inline':'none';
}

// ── Toggle password eye ────────────────────
window.toggleEye = function(id, btn) {
  var inp = document.getElementById(id);
  inp.type = inp.type==='password' ? 'text' : 'password';
  btn.textContent = inp.type==='password' ? '👁' : '🙈';
};

// =============================================
document.addEventListener('DOMContentLoaded', function() {

  // ── Auto uppercase enrollment inputs ──────
  ['rEnroll','lEnroll','fEnroll'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', function(){
      var p=this.selectionStart; this.value=this.value.toUpperCase(); this.setSelectionRange(p,p);
    });
  });

  // ── Tab switch ────────────────────────────
  window.switchTab = function(tab) {
    var ink  = document.getElementById('tabInk');
    var tReg = document.getElementById('tabReg');
    var tLog = document.getElementById('tabLog');
    var cReg = document.getElementById('registerCard');
    var cLog = document.getElementById('loginCard');
    if(tab==='register'){
      ink.style.left='4px';
      tReg.classList.add('active'); tLog.classList.remove('active');
      cReg.style.display='block';  cLog.style.display='none';
    } else {
      ink.style.left='calc(50%)';
      tLog.classList.add('active'); tReg.classList.remove('active');
      cLog.style.display='block';  cReg.style.display='none';
    }
  };

  // ─────────────────────────────────────────
  //  REGISTER
  // ─────────────────────────────────────────
  var FIELD_IDS = ['rName','rBranch','rEnroll','rPhone','rPass','rQ1','rQ2','rQ3'];

  function updateProgress() {
    var count=0;
    if(v('rName').trim())   count++;
    if(v('rBranch'))        count++;
    if(v('rEnroll').trim()) count++;
    if(v('rPhone').trim())  count++;
    if(v('rPass'))          count++;
    if(v('rQ1').trim())     count++;
    if(v('rQ2').trim())     count++;
    if(v('rQ3').trim())     count++;
    var pct = Math.round(count/8*100);
    document.getElementById('regProg').style.width = pct+'%';
    document.getElementById('progLbl').textContent  = count+' / 8 filled';
  }

  function v(id){ var el=document.getElementById(id); return el?el.value:''; }

  FIELD_IDS.forEach(function(id){
    var el=document.getElementById(id);
    if(el){ el.addEventListener('input',updateProgress); el.addEventListener('change',updateProgress); }
  });

  // Password strength meter
  var rPass=document.getElementById('rPass');
  if(rPass) rPass.addEventListener('input', function(){
    var s=0, val=this.value;
    if(val.length>=8) s++;
    if(/[A-Z]/.test(val)) s++;
    if(/[0-9]/.test(val)) s++;
    if(/[^a-zA-Z0-9]/.test(val)) s++;
    var fill=document.getElementById('sFill');
    fill.style.width  = val.length ? ['20%','40%','70%','100%'][s-1]||'10%' : '0%';
    fill.style.background = val.length ? ['#ff4e4e','#ffb347','#f0a500','#3ddc84'][s-1]||'#ff4e4e' : '';
  });

  // Validation
  function vName(x)  { x=x.trim(); if(!x) return 'Name is required'; if(x.length<3) return 'Min 3 characters'; if(!/^[a-zA-Z\s]+$/.test(x)) return 'Letters only'; return ''; }
  function vBranch(x){ return x?'':'Please select your branch'; }
  function vEnroll(x){ x=x.trim(); if(!x) return 'Required'; if(x.length<15) return 'Too short — exactly 15 chars (e.g. E23220932900034)'; if(x.length>15) return 'Too long — exactly 15 chars'; if(!/^[A-Z]\d{14}$/.test(x)) return '1 letter + 14 digits (e.g. E23220932900034)'; return ''; }
  function vPhone(x) { x=x.trim(); if(!x) return 'Phone number is required'; if(!/^[6-9]\d{9}$/.test(x)) return 'Enter valid 10-digit Indian number'; return ''; }
  function vPass(x)  { if(!x) return 'Password is required'; if(x.length<6) return 'At least 6 characters'; return ''; }
  function vAns(x)   { return x.trim()?'':'This answer is required'; }

  var regForm = document.getElementById('registerForm');
  if(regForm) regForm.addEventListener('submit', function(e){
    e.preventDefault();
    var name=v('rName'),branch=v('rBranch'),enroll=v('rEnroll'),phone=v('rPhone'),
        pass=v('rPass'),q1=v('rQ1'),q2=v('rQ2'),q3=v('rQ3');

    var errs=[vName(name),vBranch(branch),vEnroll(enroll),vPhone(phone),vPass(pass),vAns(q1),vAns(q2),vAns(q3)];
    var ids =[['rName','rerr-name'],['rBranch','rerr-branch'],['rEnroll','rerr-enroll'],['rPhone','rerr-phone'],
              ['rPass','rerr-pass'],['rQ1','rerr-q1'],['rQ2','rerr-q2'],['rQ3','rerr-q3']];
    var hasErr=false;
    errs.forEach(function(err,i){ setF(ids[i][0],ids[i][1],err); if(err) hasErr=true; });
    if(hasErr){ shake('registerCard'); return; }

    var btn=document.getElementById('regBtn');
    setBtnLoad(btn,true);

    fetchUsers(function(err,users){
      if(err){ showToast('Connection error. Try again.','err'); setBtnLoad(btn,false); return; }

      if(users.find(function(u){ return u.enrollment===enroll.trim().toUpperCase(); })){
        setF('rEnroll','rerr-enroll','Enrollment already registered!');
        shake('registerCard'); setBtnLoad(btn,false); return;
      }

      var user={
        id:          Date.now(),
        name:        name.trim(),
        branch:      branch,
        enrollment:  enroll.trim().toUpperCase(),
        phone:       phone.trim(),
        password:    hashPass(pass),
        security:{
          q1: q1.trim().toLowerCase(),
          q2: q2.trim().toLowerCase(),
          q3: q3.trim().toLowerCase()
        },
        registeredAt: new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
      };

      users.push(user);
      saveUsers(users,function(err2){
        if(err2){ showToast('Could not save. Try again.','err'); setBtnLoad(btn,false); return; }
        localStorage.setItem('gpg_current_user', JSON.stringify(user));
        setBtnLoad(btn,false);
        showSuccess('Registration Successful!', 'Welcome, '+user.name+'!');
      });
    });
  });

  // ─────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────
  var loginForm=document.getElementById('loginForm');
  if(loginForm) loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    var enroll=v('lEnroll').trim().toUpperCase(), pass=v('lPass');
    var ee=vEnroll(enroll), pe=vPass(pass);
    setF('lEnroll','lerr-enroll',ee);
    setF('lPass','lerr-pass',pe);
    if(ee||pe){ shake('loginCard'); return; }

    var btn=document.getElementById('loginBtn');
    setBtnLoad(btn,true);

    fetchUsers(function(err,users){
      if(err){ showToast('Connection error. Try again.','err'); setBtnLoad(btn,false); return; }
      var user=users.find(function(u){ return u.enrollment===enroll; });
      if(!user){ setF('lEnroll','lerr-enroll','Enrollment not found. Please register first.'); shake('loginCard'); setBtnLoad(btn,false); return; }
      if(user.password!==hashPass(pass)){ setF('lPass','lerr-pass','Incorrect password.'); shake('loginCard'); setBtnLoad(btn,false); return; }
      localStorage.setItem('gpg_current_user',JSON.stringify(user));
      setBtnLoad(btn,false);
      showSuccess('Welcome Back!', 'Signed in as '+user.name);
    });
  });

  // ─────────────────────────────────────────
  //  FORGOT PASSWORD
  // ─────────────────────────────────────────
  var _fu=null; // forgot user

  window.openForgot=function(){
    document.getElementById('forgotOverlay').classList.add('open');
    document.body.style.overflow='hidden';
    document.getElementById('fStepA').style.display='block';
    document.getElementById('fStepB').style.display='none';
    document.getElementById('fStepC').style.display='none';
    document.getElementById('fEnroll').value='';
    _fu=null;
  };
  window.closeForgot=function(){
    document.getElementById('forgotOverlay').classList.remove('open');
    document.body.style.overflow='';
  };
  document.getElementById('forgotOverlay').addEventListener('click',function(e){
    if(e.target===this) closeForgot();
  });

  window.fStep1=function(){
    var enroll=document.getElementById('fEnroll').value.trim().toUpperCase();
    var ee=vEnroll(enroll); setF('fEnroll','ferr-enroll',ee);
    if(ee){ shake('forgotModal'); return; }
    fetchUsers(function(err,users){
      if(err){ showToast('Connection error.','err'); return; }
      var user=users.find(function(u){ return u.enrollment===enroll; });
      if(!user){ setF('fEnroll','ferr-enroll','No account found with this enrollment.'); shake('forgotModal'); return; }
      _fu=user;
      document.getElementById('fStepA').style.display='none';
      document.getElementById('fStepB').style.display='block';
    });
  };

  window.fStep2=function(){
    if(!_fu) return;
    var a1=document.getElementById('fQ1').value.trim().toLowerCase();
    var a2=document.getElementById('fQ2').value.trim().toLowerCase();
    var a3=document.getElementById('fQ3').value.trim().toLowerCase();
    var e1=a1?'':'Required', e2=a2?'':'Required', e3=a3?'':'Required';
    setF('fQ1','ferr-fq1',e1); setF('fQ2','ferr-fq2',e2); setF('fQ3','ferr-fq3',e3);
    if(e1||e2||e3){ shake('forgotModal'); return; }
    if(a1!==_fu.security.q1||a2!==_fu.security.q2||a3!==_fu.security.q3){
      showToast('Answers do not match. Try again.','err'); shake('forgotModal'); return;
    }
    document.getElementById('fStepB').style.display='none';
    document.getElementById('fStepC').style.display='block';
  };

  window.fStep3=function(){
    if(!_fu) return;
    var np=document.getElementById('fNewPass').value;
    var pe=vPass(np); setF('fNewPass','ferr-newpass',pe);
    if(pe){ shake('forgotModal'); return; }
    fetchUsers(function(err,users){
      if(err){ showToast('Connection error.','err'); return; }
      var idx=users.findIndex(function(u){ return u.enrollment===_fu.enrollment; });
      if(idx===-1){ showToast('User not found.','err'); return; }
      users[idx].password=hashPass(np);
      saveUsers(users,function(err2){
        if(err2){ showToast('Could not save.','err'); return; }
        closeForgot();
        showToast('Password reset successfully!');
        _fu=null;
        switchTab('login');
      });
    });
  };

  // ── Success overlay ────────────────────────
  function showSuccess(title, msg){
    document.getElementById('successTitle').textContent=title;
    document.getElementById('successMsg').textContent=msg;
    document.getElementById('successOv').style.display='flex';
  }

  window.goToDashboard=function(){
    // Will redirect to dashboard.html when built
    window.location.href='dashboard.html';
  };

  // ── If already logged in ───────────────────
  try{
    var cu=JSON.parse(localStorage.getItem('gpg_current_user'));
    if(cu&&cu.enrollment&&cu.name){
      // Pre-fill login tab
      var le=document.getElementById('lEnroll');
      if(le) le.value=cu.enrollment;
    }
  }catch(e){}

});
