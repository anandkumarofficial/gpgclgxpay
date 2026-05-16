// =============================================
//  GP GONDA – EVENT PAYMENT TRACKER
//  script.js  —  v3  (2-event limit + payment)
// =============================================

var BIN_ID  = '6a07f6fac0954111d82ee279';
var API_KEY = '$2a$10$ntQbtOWUeUX0nQqmVNx5/.SmTfpLHr4.X4I2ILQ7aTEtD5/NhMybW';
var BIN_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

// ── READ from JSONBin ──────────────────────
function fetchEvents(callback) {
  fetch(BIN_URL + '/latest', { headers: { 'X-Access-Key': API_KEY } })
  .then(function(r){ return r.json(); })
  .then(function(d){
    var ev = d.record || [];
    ev = ev.filter(function(e){ return !e.init; });
    callback(null, ev);
  })
  .catch(function(e){ callback(e, []); });
}

// ── WRITE to JSONBin ───────────────────────
function saveEvents(events, callback) {
  fetch(BIN_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Access-Key': API_KEY },
    body: JSON.stringify(events)
  })
  .then(function(r){ return r.json(); })
  .then(function(){ if(callback) callback(null); })
  .catch(function(e){ if(callback) callback(e); });
}

// ── Escape HTML ────────────────────────────
function esc(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// =============================================
document.addEventListener('DOMContentLoaded', function () {

  // Logo fallback
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
  function validateName(v)   { v=v.trim(); if(!v) return 'Name is required'; if(v.length<3) return 'At least 3 characters'; if(!/^[a-zA-Z\s]+$/.test(v)) return 'Letters only'; return ''; }
  function validateBranch(v) { return v ? '' : 'Please select your branch'; }
  function validateEnroll(v) {
    v=v.trim();
    if(!v)            return 'Enrollment number is required';
    if(v.length<15)   return 'Too short — exactly 15 characters (e.g. E23220932900034)';
    if(v.length>15)   return 'Too long — exactly 15 characters (e.g. E23220932900034)';
    if(!/^[A-Z]\d{14}$/.test(v)) return '1 letter + 14 digits (e.g. E23220932900034)';
    return '';
  }

  function setField(inputId, errId, msg) {
    var inp=document.getElementById(inputId), err=document.getElementById(errId);
    if(!inp||!err) return;
    err.textContent=msg;
    if(msg){ inp.classList.add('error'); inp.classList.remove('valid'); }
    else   { inp.classList.remove('error'); inp.classList.add('valid'); }
  }

  var nameEl=document.getElementById('studentName'), branchEl=document.getElementById('studentBranch'), enrollEl=document.getElementById('enrollNo');
  if(nameEl)   nameEl.addEventListener('input',   function(){ setField('studentName','err-name',validateName(this.value)); });
  if(branchEl) branchEl.addEventListener('change',function(){ setField('studentBranch','err-branch',validateBranch(this.value)); });
  if(enrollEl) enrollEl.addEventListener('input',  function(){
    var pos=this.selectionStart; this.value=this.value.toUpperCase(); this.setSelectionRange(pos,pos);
    setField('enrollNo','err-enroll',validateEnroll(this.value));
  });

  var signupForm=document.getElementById('signupForm');
  if(signupForm) {
    signupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var ne=validateName(nameEl.value), be=validateBranch(branchEl.value), ee=validateEnroll(enrollEl.value);
      setField('studentName','err-name',ne); setField('studentBranch','err-branch',be); setField('enrollNo','err-enroll',ee);
      if(ne||be||ee){ shakeCard('signupCard'); return; }

      var btn=document.getElementById('submitBtn');
      btn.disabled=true;
      document.getElementById('btnText').style.display='none';
      document.getElementById('btnArrow').style.display='none';
      document.getElementById('btnLoader').style.display='inline';

      var data={ name:nameEl.value.trim(), branch:branchEl.value, enrollment:enrollEl.value.trim().toUpperCase(),
        registeredAt:new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}), paid:false };

      try {
        var students=JSON.parse(localStorage.getItem('gpg_students')||'[]');
        if(!students.find(function(s){ return s.enrollment===data.enrollment; })) students.push(data);
        localStorage.setItem('gpg_students',JSON.stringify(students));
        localStorage.setItem('gpg_current_user',JSON.stringify(data));
      } catch(ex){}

      document.getElementById('successDetails').innerHTML=
        detailRow('Name',data.name)+detailRow('Branch',data.branch)+
        detailRow('Enrollment',data.enrollment)+detailRow('Registered',data.registeredAt);
      swapCards('signupCard','successCard');
    });
  }

  var goLogin=document.getElementById('goLogin');
  if(goLogin) goLogin.addEventListener('click',function(e){ e.preventDefault(); alert('Login page coming soon!'); });

  // =============================================
  //  CREATE EVENT MODAL — 2 STEPS
  // =============================================
  var overlay  = document.getElementById('eventModalOverlay');
  var openBtn  = document.getElementById('openEventModal');
  var closeBtn = document.getElementById('closeEventModal');
  var closeBtn2= document.getElementById('closeEventModal2');

  // Step 1 inputs
  var evtName   = document.getElementById('evtName');
  var evtReason = document.getElementById('evtReason');
  var evtDesc   = document.getElementById('evtDesc');
  var evtAmount = document.getElementById('evtAmount');
  var evtDate   = document.getElementById('evtDate');

  // Step 2 inputs
  var payMobile = document.getElementById('payMobile');
  var payUpi    = document.getElementById('payUpi');
  var payQr     = document.getElementById('payQr');

  // Buttons
  var goPayBtn  = document.getElementById('goToPaymentBtn');
  var saveBtn   = document.getElementById('saveEventBtn');
  var backBtn   = document.getElementById('backToStep1');

  // Step dots
  var stepDot1 = document.getElementById('stepDot1');
  var stepDot2 = document.getElementById('stepDot2');

  if(evtDate) evtDate.min = new Date().toISOString().split('T')[0];

  // Store QR as base64
  var qrBase64 = '';

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
    showStep(1);
    if(evtName) evtName.focus();
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow='';
  }
  function showStep(n) {
    document.getElementById('modalStep1').style.display = n===1 ? 'block' : 'none';
    document.getElementById('modalStep2').style.display = n===2 ? 'block' : 'none';
    if(stepDot1) stepDot1.classList.toggle('active', n===1);
    if(stepDot2) stepDot2.classList.toggle('active', n===2);
  }

  if(openBtn) openBtn.addEventListener('click', function() {
    // ── CHANGE 1: Max 2 events per person ──
    var currentUser = null;
    try{ currentUser=JSON.parse(localStorage.getItem('gpg_current_user')); } catch(e){}
    if(!currentUser){ alert('Please register/login first before creating an event!'); return; }

    var myName = currentUser.name.trim().toLowerCase();

    fetchEvents(function(err, allEvents){
      if(err){ openModal(); return; } // if fetch fails, just open anyway

      var myEvents = allEvents.filter(function(ev){
        return ev.createdBy && ev.createdBy.trim().toLowerCase() === myName;
      });

      if(myEvents.length >= 2){
        alert('You already have 2 active events!\n\nPlease delete at least 1 of your existing events before creating a new one.');
        return;
      }
      openModal();
    });
  });

  if(closeBtn)  closeBtn.addEventListener('click',  closeModal);
  if(closeBtn2) closeBtn2.addEventListener('click', closeModal);
  if(overlay)   overlay.addEventListener('click', function(e){ if(e.target===overlay) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

  // ── Step 1 Validation ──────────────────────
  function vName(v)   { v=v.trim(); if(!v) return 'Event name is required'; if(v.length<3) return 'At least 3 characters'; return ''; }
  function vReason(v) { v=v.trim(); if(!v) return 'Reason is required'; if(v.length<5) return 'Please be more specific'; return ''; }
  function vDesc(v)   { v=v.trim(); if(!v) return 'Description is required'; if(v.length<10) return 'At least 10 characters'; return ''; }
  function vAmount(v) { var n=parseFloat(v); if(!v||isNaN(n)) return 'Amount is required'; if(n<1) return 'At least Rs 1'; return ''; }
  function vDate(v)   { if(!v) return 'Last date is required'; if(new Date(v)<new Date(new Date().toDateString())) return 'Cannot be in the past'; return ''; }

  function setMF(inputId, errId, msg) {
    var inp=document.getElementById(inputId), err=document.getElementById(errId);
    if(!inp||!err) return;
    err.textContent=msg;
    if(msg){ inp.classList.add('error'); inp.classList.remove('valid'); }
    else   { inp.classList.remove('error'); inp.classList.add('valid'); }
  }

  function checkStep1() {
    var ok = !vName(evtName.value)&&!vReason(evtReason.value)&&!vDesc(evtDesc.value)&&!vAmount(evtAmount.value)&&!vDate(evtDate.value);
    goPayBtn.disabled = !ok;
    document.getElementById('goPayText').style.display  = ok ? 'none'   : 'inline';
    document.getElementById('goPayArrow').style.display = ok ? 'inline' : 'none';
  }

  if(evtName)   evtName.addEventListener('input',   function(){ setMF('evtName','merr-ename',vName(this.value));     checkStep1(); });
  if(evtReason) evtReason.addEventListener('input',  function(){ setMF('evtReason','merr-reason',vReason(this.value)); checkStep1(); });
  if(evtDesc)   evtDesc.addEventListener('input',    function(){ setMF('evtDesc','merr-desc',vDesc(this.value));       checkStep1(); });
  if(evtAmount) evtAmount.addEventListener('input',  function(){ setMF('evtAmount','merr-amount',vAmount(this.value)); checkStep1(); });
  if(evtDate)   evtDate.addEventListener('change',   function(){ setMF('evtDate','merr-date',vDate(this.value));       checkStep1(); });

  // ── Go to Step 2 ───────────────────────────
  if(goPayBtn) goPayBtn.addEventListener('click', function(){
    if(vName(evtName.value)||vReason(evtReason.value)||vDesc(evtDesc.value)||vAmount(evtAmount.value)||vDate(evtDate.value)) return;
    showStep(2);
    if(payMobile) payMobile.focus();
  });

  // ── Back to Step 1 ─────────────────────────
  if(backBtn) backBtn.addEventListener('click', function(){ showStep(1); });

  // ── Step 2: QR Preview ─────────────────────
  if(payQr) payQr.addEventListener('change', function(){
    var file=this.files[0];
    if(!file){ qrBase64=''; return; }
    if(file.size > 2*1024*1024){ alert('QR image must be smaller than 2MB'); this.value=''; qrBase64=''; return; }

    var reader=new FileReader();
    reader.onload=function(e){
      qrBase64=e.target.result;
      var preview=document.getElementById('qrPreview');
      var inner=document.getElementById('qrUploadInner');
      preview.src=qrBase64;
      preview.style.display='block';
      inner.style.display='none';
      document.getElementById('merr-qr').textContent='';
    };
    reader.readAsDataURL(file);
  });

  // ── Step 2 Validation ──────────────────────
  function vMobile(v) {
    v=v.trim();
    if(!v) return 'Mobile number is required';
    if(!/^[6-9]\d{9}$/.test(v)) return 'Enter a valid 10-digit Indian mobile number';
    return '';
  }
  function vUpi(v) {
    v=v.trim();
    if(!v) return ''; // optional
    if(!/^[\w.\-]{3,}@[\w]{3,}$/.test(v)) return 'Enter valid UPI ID (e.g. name@upi)';
    return '';
  }

  // ── Final Save (Step 2) ────────────────────
  if(saveBtn) saveBtn.addEventListener('click', function(){
    // Validate step 2
    var me=vMobile(payMobile?payMobile.value:'');
    var ue=vUpi(payUpi?payUpi.value:'');
    var qe=!qrBase64 ? 'QR code is required — please upload your payment QR' : '';

    if(payMobile) setMF('payMobile','merr-mobile',me);
    if(payUpi)    setMF('payUpi','merr-upi',ue);
    document.getElementById('merr-qr').textContent=qe;

    if(me||ue||qe){ shakeCard('eventModal'); return; }

    // Show loader
    saveBtn.disabled=true;
    document.getElementById('saveEvtText').style.display='none';
    document.getElementById('saveEvtLoader').style.display='inline';

    var currentUser=null;
    try{ currentUser=JSON.parse(localStorage.getItem('gpg_current_user')); } catch(e){}

    var newEvent = {
      id:           Date.now(),
      name:         evtName.value.trim(),
      reason:       evtReason.value.trim(),
      description:  evtDesc.value.trim(),
      amount:       parseFloat(evtAmount.value),
      lastDate:     evtDate.value,
      createdBy:    currentUser ? currentUser.name       : 'Anonymous',
      createdByEnr: currentUser ? currentUser.enrollment : '',
      createdAt:    new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),
      payment: {
        mobile: payMobile ? payMobile.value.trim() : '',
        upi:    payUpi    ? payUpi.value.trim()    : '',
        qr:     qrBase64
      }
    };

    fetchEvents(function(err, currentEvents){
      if(err){ alert('Could not connect. Check internet and try again.'); resetSaveBtn(); return; }
      currentEvents.unshift(newEvent);
      saveEvents(currentEvents, function(err2){
        if(err2){ alert('Could not save event. Try again.'); resetSaveBtn(); return; }
        resetFullForm();
        closeModal();
        showToast('Event Successfully Created!', 'success');
        renderEvents();
      });
    });
  });

  function resetSaveBtn(){
    document.getElementById('saveEvtText').style.display='inline';
    document.getElementById('saveEvtLoader').style.display='none';
    saveBtn.disabled=false;
  }

  function resetFullForm(){
    // Step 1
    evtName.value=evtReason.value=evtDesc.value=evtAmount.value=evtDate.value='';
    [evtName,evtReason,evtDesc,evtAmount,evtDate].forEach(function(el){ el.classList.remove('valid','error'); });
    document.getElementById('goPayText').style.display='inline';
    document.getElementById('goPayArrow').style.display='none';
    goPayBtn.disabled=true;
    // Step 2
    if(payMobile) payMobile.value='';
    if(payUpi)    payUpi.value='';
    if(payQr)     payQr.value='';
    qrBase64='';
    var preview=document.getElementById('qrPreview');
    if(preview){ preview.src=''; preview.style.display='none'; }
    var inner=document.getElementById('qrUploadInner');
    if(inner) inner.style.display='flex';
    document.getElementById('saveEvtText').style.display='inline';
    document.getElementById('saveEvtLoader').style.display='none';
    saveBtn.disabled=false;
    ['merr-mobile','merr-upi','merr-qr'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.textContent='';
    });
  }

  // =============================================
  //  PAYMENT INFO POPUP (for students viewing)
  // =============================================
  var payPopup     = document.getElementById('paymentPopup');
  var payPopupOver = document.getElementById('paymentPopupOverlay');

  function openPaymentPopup(ev) {
    if(!payPopup||!ev.payment) return;
    document.getElementById('ppEventName').textContent = ev.name;
    document.getElementById('ppAmount').textContent    = ev.amount;
    document.getElementById('ppMobile').textContent    = ev.payment.mobile || '—';
    document.getElementById('ppUpi').textContent       = ev.payment.upi    || 'Not provided';

    var qrImg = document.getElementById('ppQrImg');
    if(ev.payment.qr){
      qrImg.src=ev.payment.qr; qrImg.style.display='block';
    } else {
      qrImg.style.display='none';
    }
    payPopupOver.classList.add('open');
    document.body.style.overflow='hidden';
  }

  if(payPopupOver) payPopupOver.addEventListener('click', function(e){
    if(e.target===payPopupOver){ payPopupOver.classList.remove('open'); document.body.style.overflow=''; }
  });
  var ppClose = document.getElementById('ppClose');
  if(ppClose) ppClose.addEventListener('click', function(){ payPopupOver.classList.remove('open'); document.body.style.overflow=''; });

  // =============================================
  //  RENDER EVENTS
  // =============================================
  function renderEvents() {
    var grid  = document.getElementById('eventsGrid');
    var noMsg = document.getElementById('noEventsMsg');
    if(!grid) return;

    noMsg.style.display='none';
    Array.from(grid.querySelectorAll('.event-card,.loading-msg')).forEach(function(c){ c.remove(); });

    var loader=document.createElement('div');
    loader.className='loading-msg';
    loader.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#9a97a3;font-family:\'JetBrains Mono\',monospace;font-size:0.85rem;letter-spacing:2px;">LOADING EVENTS...</div>';
    grid.appendChild(loader);

    fetchEvents(function(err, events){
      Array.from(grid.querySelectorAll('.loading-msg')).forEach(function(c){ c.remove(); });
      if(err){
        noMsg.innerHTML='<div class="no-events-icon">⚠️</div><p>Could not load events. Check your internet.</p>';
        noMsg.style.display='block'; return;
      }
      if(!events.length){
        noMsg.innerHTML='<div class="no-events-icon">📅</div><p>No events yet. Click <strong>Create New Event</strong> to add one!</p>';
        noMsg.style.display='block'; return;
      }

      noMsg.style.display='none';

      var loggedInUser=null;
      try{ loggedInUser=JSON.parse(localStorage.getItem('gpg_current_user')); } catch(e){}
      var loggedInName = loggedInUser ? loggedInUser.name.trim().toLowerCase()       : '';
      var loggedInEnr  = loggedInUser ? (loggedInUser.enrollment||'').trim().toUpperCase() : '';

      events.forEach(function(ev, idx){
        var today    = new Date(new Date().toDateString());
        var lastDate = new Date(ev.lastDate);
        var expired  = lastDate < today;
        var daysLeft = Math.ceil((lastDate-today)/(1000*60*60*24));
        var dateStr  = lastDate.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

        var dueBadge = expired
          ? '<span class="event-meta-val date-warning">Expired</span>'
          : '<span class="event-meta-val'+(daysLeft<=3?' date-warning':'')+'">'+dateStr+(daysLeft<=3?' ('+daysLeft+' days left!)':'')+'</span>';

        // Match by enrollment number first (most reliable), fallback to name
        var isCreator = false;
        if(loggedInEnr && ev.createdByEnr) {
          isCreator = (String(ev.createdByEnr).trim().toUpperCase() === String(loggedInEnr).trim().toUpperCase());
        }
        // Always also try name match as fallback (for old events without enrollment stored)
        if(!isCreator && loggedInName && ev.createdBy) {
          isCreator = (String(ev.createdBy).trim().toLowerCase() === String(loggedInName).trim().toLowerCase());
        }

        var deleteBtn = isCreator
          ? '<button class="event-delete-btn" data-id="'+ev.id+'">&#128465; Delete</button>'
          : '<span class="event-creator-only">Only creator can delete</span>';

        // Pay Now — show to everyone EXCEPT the creator
        var hasPayment = ev.payment && (ev.payment.mobile || ev.payment.qr || ev.payment.upi);
        var payBtn = (!isCreator && hasPayment)
          ? '<button class="event-pay-btn" data-id="'+ev.id+'">&#128179; Pay Now</button>'
          : (!isCreator ? '<span class="event-creator-only">Payment info not added</span>' : '');

        var card=document.createElement('div');
        card.className='event-card';
        card.style.animationDelay=(idx*0.07)+'s';
        card.dataset.id=ev.id;
        card.dataset.ev=JSON.stringify(ev);
        card.innerHTML=
          '<div class="event-card-badge'+(expired?' expired':'')+'">'+( expired?'EXPIRED':'ACTIVE')+'</div>'+
          '<div class="event-card-name">'+esc(ev.name)+'</div>'+
          '<div class="event-card-reason">&#9670; '+esc(ev.reason)+'</div>'+
          '<div class="event-card-desc">'+esc(ev.description)+'</div>'+
          '<div class="event-card-meta">'+
            '<div class="event-meta-row"><span class="event-meta-label">Amount</span><span class="event-meta-val amount">&#8377;'+ev.amount+' / student</span></div>'+
            '<div class="event-meta-row"><span class="event-meta-label">Last Date</span>'+dueBadge+'</div>'+
          '</div>'+
          '<div class="event-card-footer">'+
            '<span class="event-creator">By '+esc(ev.createdBy)+' &middot; '+esc(ev.createdAt)+'</span>'+
            '<div style="display:flex;gap:8px;align-items:center;">'+payBtn+deleteBtn+'</div>'+
          '</div>';
        grid.appendChild(card);
      });

      // Pay Now click
      grid.querySelectorAll('.event-pay-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          var ev=JSON.parse(this.closest('.event-card').dataset.ev);
          openPaymentPopup(ev);
        });
      });

      // Delete click
      grid.querySelectorAll('.event-delete-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(!confirm('Delete this event? This removes it for EVERYONE!')) return;
          var id = String(this.dataset.id); // always string — avoids number vs string mismatch
          var card=this.closest('.event-card');
          if(card){ card.style.opacity='0.4'; card.style.pointerEvents='none'; }
          fetchEvents(function(err,evs){
            if(err){ alert('Could not connect. Try again.'); if(card){card.style.opacity='1';card.style.pointerEvents='';} return; }
            evs=evs.filter(function(e){ return String(e.id) !== id; }); // compare both as strings
            saveEvents(evs,function(err2){
              if(err2){ alert('Could not delete. Try again.'); if(card){card.style.opacity='1';card.style.pointerEvents='';} return; }
              renderEvents();
            });
          });
        });
      });
    });
  }

  renderEvents();
  setInterval(renderEvents, 30000);

  // =============================================
  //  HELPERS
  // =============================================
  function detailRow(label, value) {
    var d=document.createElement('div'); d.appendChild(document.createTextNode(value));
    return '<div class="detail-row"><span class="detail-label">'+label+'</span><span class="detail-val">'+d.innerHTML+'</span></div>';
  }
  function swapCards(hideId, showId) {
    var hide=document.getElementById(hideId), show=document.getElementById(showId);
    hide.style.transition='opacity 0.35s ease,transform 0.35s ease';
    hide.style.opacity='0'; hide.style.transform='translateY(-20px)';
    setTimeout(function(){
      hide.style.display='none'; show.style.display='block';
      show.style.opacity='0'; show.style.transform='translateY(20px)';
      show.style.transition='opacity 0.35s ease,transform 0.35s ease';
      setTimeout(function(){ show.style.opacity='1'; show.style.transform='translateY(0)'; },40);
    },380);
  }
  function shakeCard(id) {
    var c=document.getElementById(id); if(!c) return;
    [-8,8,-6,6,-4,4,0].forEach(function(m,i){ setTimeout(function(){ c.style.transform='translateX('+m+'px)'; },i*60); });
  }

  // ── Toast notification ─────────────────────
  function showToast(message, type) {
    // Remove any existing toast
    var old = document.getElementById('gpgToast');
    if(old) old.remove();

    var toast = document.createElement('div');
    toast.id = 'gpgToast';
    toast.className = 'gpg-toast gpg-toast-' + (type||'success');
    toast.innerHTML = message;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(function(){ toast.classList.add('gpg-toast-show'); }, 10);

    // Remove after 2.5 seconds
    setTimeout(function(){
      toast.classList.remove('gpg-toast-show');
      setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 400);
    }, 2500);
  }
});

function goToDashboard() { alert('Dashboard coming soon!'); }
