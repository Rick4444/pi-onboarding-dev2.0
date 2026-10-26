/* Paytm Intelligence - client onboarding portal logic */
/* ---------- Language support: reads messages.js ---------- */
(function(){
var M=window.PI_MESSAGES||{},langs=M.languages||{en:{name:"English"}},def=M.defaultLang||"en";
/* Chooses the language: ?lang= in the link, then the saved choice, then the browser language, then the default. */
function pick(){var q=(location.search.match(/[?&]lang=([\w-]+)/)||[])[1],s="";try{s=localStorage.getItem("pind_lang_v1")||""}catch(e){}
 var nav=(navigator.language||"").toLowerCase().split("-")[0];
 return[q,s,nav].filter(function(l){return l&&M[l]&&langs[l]})[0]||def}
var lang=pick();
if(!M.en&&!M[def]){console.error("[Onboarding] messages.js was not loaded. Upload messages.js next to index.html.");var bn=document.createElement("div");bn.setAttribute("role","alert");bn.style.cssText="position:fixed;z-index:99999;left:0;right:0;top:0;padding:10px 16px;background:#b3261e;color:#fff;font:600 14px system-ui,sans-serif;text-align:center";bn.textContent="Setup error: messages.js was not found. Upload messages.js to the same folder as index.html, then refresh.";document.addEventListener("DOMContentLoaded",function(){document.body.appendChild(bn)});if(document.body)document.body.appendChild(bn)}
/* Looks up one message: current language first, English as the fallback. */
function raw(k){var v=M[lang]&&M[lang][k];if(v==null)v=M[def]&&M[def][k];return v}
/* T("key",{name:"x"}) returns the message with {name} filled in. Returns the key itself if the message is missing. */
var warned=false;
/* A missing message means messages.js on the server is older than app.js: show nothing instead of the raw key, and tell the admin once. */
function missing(k){console.error("[Onboarding] message missing: "+k);if(warned||!document.body)return;warned=true;var b=document.createElement("div");b.setAttribute("role","alert");b.style.cssText="position:fixed;z-index:99999;left:0;right:0;bottom:0;padding:10px 16px;background:#b3261e;color:#fff;font:600 14px system-ui,sans-serif;text-align:center";b.textContent="Setup notice: messages.js is out of date. Upload the latest messages.js and styles.css, then hard-refresh.";document.body.appendChild(b)}
function T(k,vars){var v=raw(k);if(v==null){missing(k);return""}vars=vars||{};if(vars.year==null)vars.year=new Date().getFullYear();
 return String(v).replace(/\{(\w+)\}/g,function(m,n){return vars[n]!=null?vars[n]:m})}
window.PI_T=T;window.PI_HAS=function(k){return raw(k)!=null};window.PI_LANG=lang;
/* Fills every data-i18n / data-i18n-attr element in index.html from messages.js and sets the page language. */
function apply(){
 document.documentElement.lang=lang;document.documentElement.dir=(langs[lang]&&langs[lang].dir)||"ltr";
 Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"),function(e){e.textContent=T(e.getAttribute("data-i18n"))});
 Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-attr]"),function(e){e.getAttribute("data-i18n-attr").split(";").forEach(function(p){var i=p.indexOf(":");if(i>0)e.setAttribute(p.slice(0,i).trim(),T(p.slice(i+1).trim()))})});
}
apply();
var codes=Object.keys(langs);
if(codes.length>1){var bar=document.getElementById("langhost");if(bar){var sel=document.createElement("select");sel.className="langsel";sel.setAttribute("aria-label",T("lang.label"));
 codes.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=langs[c].name||c;if(c===lang)o.selected=true;sel.appendChild(o)});
 sel.addEventListener("change",function(){try{localStorage.setItem("pind_lang_v1",sel.value)}catch(e){}var u=location.pathname+location.search.replace(/([?&])lang=[\w-]+&?/,"$1").replace(/[?&]$/,"")+location.hash;location.href=u});
 bar.appendChild(sel)}}
})();
(function(){
"use strict";

/* =====================================================================
   SUBMISSION SETUP
   Each form posts to its original Google Form, so responses land in the
   same sheet with the same column names. Paste the entry-ID map for each
   form below (see the instructions that came with this file). Keys must be
   the exact question titles. Example: {"Company / Business Name":"entry.123456789"}
   ===================================================================== */
var T=window.PI_T,HAS=window.PI_HAS,CFG=window.PI_CONFIG||{},NET=Object.assign({TIMEOUT_MS:45000,MAX_RETRIES:2,RETRY_BASE_MS:1500,SLOW_MS:8000},(window.PI_CONFIG||{}).NETWORK||{}),FORM_IDS=CFG.FORM_IDS||{},ENTRY=CFG.ENTRY||{},HIDDEN_SELECT_VALUE=CFG.HIDDEN_SELECT_VALUE||"";

var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
var TEST=!!CFG.ENABLE_TEST_MODES,preview=TEST&&/[?&]preview\b/.test(location.search),debug=TEST&&/[?&]debug\b/.test(location.search);
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var norm=function(s){return String(s).replace(/\s+/g," ").trim()};
var d0=new Date(),today=d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0")+"-"+String(d0.getDate()).padStart(2,"0");

/* ---------- Form definitions ----------
   The first text of each field is the exact Google Form question title. It is the key used to send the
   answer to Google, so do not translate or reword it here. What the customer SEES (labels, hints,
   notices, section names, answer wording) comes from messages.js. */
var YN=["Yes","No"];
var F=function(id,label,type,o){return Object.assign({id:id,label:label,type:type||"text"},o||{})};
var R=function(id,l,opts,o){return F(id,l,"radio",Object.assign({opts:opts},o))};
var C=function(id,l,opts,o){return F(id,l,"check",Object.assign({opts:opts},o))};
var S=function(id,l,opts,o){return F(id,l,"select",Object.assign({opts:opts},o))};
var is=function(id,v){return function(g){return g(id)===v}};

var hasSms=function(t){return function(g){var v=g("st");return Array.isArray(v)&&v.indexOf(t)>-1}};
var hasW=is("waba","Yes"),hostY=is("host","Yes"),bspOther=function(g){return g("host")==="Yes"&&g("bsp")==="Other"};
var FORMS={
whatsapp:{color:"#25d366",secs:[
 [R("waba","Does the client already have a WhatsApp Business Account (WABA)?",YN)],
 [F("bmid","Business Manager (BM) ID","text",{title:"If Yes, please share the Business Manager (BM) ID",show:hasW}),F("fbu","Facebook Page URL","url",{title:"If Yes, please share the Facebook Page URL",show:hasW}),F("adm","Admin access","ack",{title:"Does the client have Admin access to the Business Manager?"})],
 [R("use","Is the client currently using",["WhatsApp Business App","WhatsApp Business API","Personal WhatsApp"]),F("wan","WhatsApp Business Number","tel"),R("host","Is the WhatsApp number currently hosted with another BSP?",YN),S("bsp","If Yes, who is the current BSP?",["Karix","Gupshup","WATI","Interakt","Infobip","Netcore","Other"],{show:hostY}),F("bspo","If \"Other\" BSP, please specify","text",{show:bspOther}),R("mig","Does the client want to migrate the existing WhatsApp number to Paytm?",YN,{show:hostY})]]},
sms:{color:"#ffb547",secs:[
 [F("pe","Principal Entity (PE) ID","text"),S("op","Which DLT operator is the business registered with?",["Airtel","Jio","Vodafone Idea (Vi)","BSNL","Smart Ping","Tata Tele"])],
 [C("st","What type of SMS will be sent?",["Transactional","Promotional"])],
 [F("sidt","Approved Transactional Sender ID(s)","text",{show:hasSms("Transactional"),full:1,raw:1}),F("sidp","Approved Promotional Sender ID(s)","text",{show:hasSms("Promotional"),full:1,raw:1})]]},
rcs:{color:"#6b95ff",secs:[
 [F("bn","Brand Name to be displayed on RCS"),F("ln","Legal Name of the Brand"),C("uc","Intended use case for RCS messaging",["Promotional","Transactional"]),F("an","Agent Name (Display Name)"),F("ad","Agent Description","textarea",{max:100}),F("lg","Agent Logo","imglink",{kind:"logo",title:"Agent Logo - link to file (share PNG/JPG over email or paste a link - 224 px x 224px under 50kb)"}),F("hr","Hero Image / Banner","imglink",{kind:"hero",title:"Hero Image / Banner - link to file ( 1440 \u00D7 448 pixels, under 200kb, 45:14 aspect ratio)"}),F("bc","Brand Colors (Hex Code)","hex",{opt:1})],
 [F("cp","Customer Support Phone Number","tel"),F("ce","Customer Support Email","email"),F("cw","Business Website URL","url")],
 [F("cons","How do you obtain customer consent before sending RCS messages?","url",{full:1})],
 [F("pp","Privacy Policy URL","url"),F("tc","Terms & Conditions URL","url")]]}
};
var ORDER=["whatsapp","sms","rcs"];
var tabName=function(k){return T("tab."+k)};
/* Business information is entered once and sent with every channel. BI_MAP says which Google Form question each answer fills. */
var BI_DEF={groups:[
 [F("pc","Name","text",{auto:"name"}),F("email","Email","email",{auto:"email"}),F("mob","Contact Number","tel",{auto:"tel"}),F("des","Designation","text",{auto:"organization-title"})],
 [F("co","Company Name","text",{auto:"organization"}),F("reg","Registered Business Name","text"),F("web","Website","url",{auto:"url"}),F("am","Account Manager Name","text",{auto:"off"})]]};
BI_DEF.specs=[].concat.apply([],BI_DEF.groups);
var BI_MAP={
 whatsapp:{am:"Account Manager Name",email:"emailAddress",co:"Company / Business Name",reg:"Registered Business Name (as per legal documents)",web:"Business Website",pc:"Primary Business Contact Name",des:"Designation",mob:"Mobile Number"},
 sms:{am:"Account Manager Name",email:"emailAddress",co:"Company / Business Name",reg:"Registered Business Name",web:"Business Website",pc:"Primary Contact Name",des:"Designation",mob:"Mobile Number"},
 rcs:{am:"Account Manager Name",email:"emailAddress",co:"Company / Business Name",reg:"Registered Business Name",web:"Business Website",pc:"SPOC Name",des:"SPOC Designation",mob:"SPOC Mobile Number"}
};
/* Text shown to the customer, read from messages.js */
var fl=function(key,s){var k="f."+key+"."+s.id;return HAS(k)?T(k):""};
var fh=function(key,s){var k="f."+key+"."+s.id+".hint";return HAS(k)?T(k):""};
var opt=function(o){var k="opt."+o;return HAS(k)?T(k):o};

/* ---------- Validation ---------- */
var URLRE=/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;
/* Validates one field value. Returns "" when valid, otherwise the message to show. Optional fields may be empty. */
function check(s,v){
 var empty=Array.isArray(v)?!v.length:!v;
 if(empty&&s.opt)return"";
 if(empty)return s.type==="ack"?T("err.ack"):s.type==="imglink"?(s._mode==="upload"?T("err.imgUpload"):T("err.imgPaste")):s.type==="check"?T("err.check"):s.type==="radio"?T("err.radio"):s.type==="select"?T("err.select"):T("err.required");
 switch(s.type){
  case"email":return/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)?"":T("err.email");
  case"tel":var d=v.replace(/\D/g,"");return/^\+?[\d\s-]+$/.test(v)&&d.length>=10&&d.length<=15?"":T("err.tel");
  case"url":return URLRE.test(v)?"":T("err.url");
  case"imglink":return URLRE.test(v)?"":T("err.imgurl");
  case"hex":return/^#?[0-9a-f]{6}$/i.test(v)?"":T("err.hex");
  case"number":return/^[1-9]\d{0,5}$/.test(v)?"":T("err.number");
  case"date":return v>=today?"":T("err.date");
  case"phones":var a=v.split(/[\n,;]+/).map(function(x){return x.trim()}).filter(Boolean);
   if(a.length<5||a.length>10)returnT("err.phones.range");
   return a.every(function(x){return check({type:"tel"},x)===""})?"":T("err.phones.bad");
 }
 if(s.type==="text"&&v.length<2)returnT("err.text.min");
 if(s.type==="textarea"&&v.length<5)returnT("err.textarea.min");
 if(s.max&&v.length>s.max)returnT("err.max",{max:s.max});
 return"";
}

/* ---------- Build UI ---------- */
var tabs=$("#tabs"),panels=$("#panels"),state={},active="",unlocked=false,confirmed=false,submitted={},BIOK="pind_onboarding_bi_ok_v1";
try{confirmed=localStorage.getItem(BIOK)==="1"}catch(e){}
try{submitted=JSON.parse(sessionStorage.getItem("pind_onboarding_done_v1")||"{}")}catch(e){}
/* Returns the HTML for one question (radio, checkbox, dropdown, text, image link and so on) of form "key". */
function fieldHTML(key,s){
 var id=key+"-"+s.id,dl=fl(key,s),hh=fh(key,s),
  /* optional "?" help: shown when messages.js has a help.<form>.<id> text for this question */
  hk="help."+key+"."+s.id,hp=HAS(hk),
  qm=hp?'<button type="button" class="qm" aria-expanded="false" aria-controls="'+id+'-help" aria-label="'+esc(T("help.aria",{q:dl}))+'">?</button>':"",
  helpP=hp?'<p class="helptxt" id="'+id+'-help" hidden>'+esc(T(hk))+'</p>':"",
  lab=esc(dl)+(s.opt?'<span class="optl"> '+esc(T("lbl.optional"))+'</span>':'<span class="req" aria-hidden="true"> *</span>')+qm,
  hint=(hh?'<p class="hint" id="'+id+'-h">'+esc(hh)+'</p>':"")+helpP,
  err='<p class="err" id="'+id+'-e" role="alert"></p>';
 if(s.type==="radio"||s.type==="check"){
  var t=s.type==="radio"?"radio":"checkbox";
  return'<fieldset class="f full" data-id="'+s.id+'"><legend>'+lab+'</legend>'+hint+'<div class="opts'+(s.opts.length===2&&s.opts.every(function(o){return opt(o).length<=14})?" pair":"")+'">'+s.opts.map(function(o){return'<label class="opt"><input type="'+t+'" autocomplete="off" name="'+s.id+'" value="'+esc(o)+'"><span><b class="ot">'+esc(opt(o))+'</b>'+(HAS("optd."+o)?'<small class="od">'+esc(T("optd."+o))+'</small>':"")+'</span></label>'}).join("")+'</div>'+err+'</fieldset>';
 }

 if(s.type==="imglink"){
  var ru=(CFG.IMAGE_RULES||{})[s.kind]||{},ht=T("img.hint.base")+(ru.width?T("img.hint.size",{w:ru.width,h:ru.height}):"")+(ru.maxKB?T("img.hint.kb",{kb:ru.maxKB}):"")+".";
  /* Without an upload service (UPLOAD_URL empty in config.js) only the link box is offered. */
  var noup=!CFG.UPLOAD_URL;if(noup)ht+=" "+T("img.hint.link");
  return'<div class="f full'+(noup?" noup":"")+'" data-id="'+s.id+'"><label for="'+id+'">'+lab+'</label><p class="hint" id="'+id+'-h">'+esc(ht)+'</p>'+
   '<div class="seg" role="group" aria-label="'+esc(T("img.source"))+'"><button type="button" class="on" data-m="link" aria-pressed="true">'+esc(T("img.paste"))+'</button><button type="button" data-m="upload" aria-pressed="false">'+esc(T("img.upload"))+'</button></div>'+
   '<input class="c" id="'+id+'" name="'+s.id+'" type="text" inputmode="url" autocomplete="off" maxlength="300" placeholder="'+esc(T("ph.link"))+'" aria-describedby="'+id+'-h '+id+'-e">'+
   '<div class="up" hidden><label class="pick" for="'+id+'-f"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><span>'+esc(T("img.pick"))+'</span><input id="'+id+'-f" type="file" accept=".jpg,.jpeg,image/jpeg"></label>'+
   '<div class="fi" hidden><img alt="'+esc(T("img.previewAlt"))+'"><span class="fn"></span><button type="button" class="rm">'+esc(T("img.remove"))+'</button></div><p class="st" aria-live="polite"></p></div>'+err+'</div>';
 }
 if(s.type==="ack"){
  return'<div class="f full" data-id="'+s.id+'"><div class="callout" role="note"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg><div><strong>'+esc(T("f."+key+"."+s.id+".heading"))+'</strong><p>'+esc(T("f."+key+"."+s.id+".note"))+'</p></div></div>'+
   '<label class="opt ack"><input type="checkbox" name="'+s.id+'" aria-describedby="'+id+'-e"><span>'+esc(T("f."+key+"."+s.id+".ack"))+'</span></label>'+err+'</div>';
 }
 var full=s.type==="textarea"||s.type==="phones"||s.full||dl.length>58,
  dby=' aria-describedby="'+(hh?id+'-h ':"")+id+'-e"',ctl;
 if(s.type==="select")ctl='<select class="c" id="'+id+'" autocomplete="off" name="'+s.id+'"'+dby+'><option value="">'+esc(T("sel.choose"))+'</option>'+s.opts.map(function(o){return'<option value="'+esc(o)+'">'+esc(opt(o))+'</option>'}).join("")+'</select>';
 else if(s.type==="textarea"||s.type==="phones")ctl='<textarea class="c" id="'+id+'" name="'+s.id+'" rows="'+(s.max?3:4)+'" maxlength="'+(s.max||2000)+'"'+dby+'></textarea>'+(s.max?'<span class="cnt" data-cnt="'+s.max+'">0 / '+s.max+'</span>':"");
 else{
  var it=s.type==="email"?"email":s.type==="tel"?"tel":s.type==="date"?"date":"text",
   im=s.type==="url"?' inputmode="url"':s.type==="number"?' inputmode="numeric"':"",
   mn=s.type==="date"?' min="'+today+'"':"",ac=s.auto?' autocomplete="'+s.auto+'"':' autocomplete="off"';
  ctl='<input class="c" id="'+id+'" name="'+s.id+'" type="'+it+'"'+im+mn+ac+(it==='text'?' maxlength="300"':'')+(s.raw?' autocapitalize="off" autocorrect="off" spellcheck="false"':'')+(s.enable?' placeholder="'+esc(T("ph.other"))+'"':'')+dby+'>';
 }
 return'<div class="f'+(full?" full":"")+'" data-id="'+s.id+'"><label for="'+id+'">'+lab+'</label>'+hint+ctl+err+'</div>';
}
/* Builds one channel form: heading, sections, fields, hidden anti-spam field, buttons and its tab. */
function build(key){
 var def=FORMS[key],specs=[],by={},secs=[];
 def.secs.forEach(function(list,i){var nk="s."+key+"."+i+".note.title";secs.push({t:T("s."+key+"."+i),specs:list,n:HAS(nk)?[T(nk),T("s."+key+"."+i+".note.text")]:null});list.forEach(function(s){specs.push(s);by[s.id]=s})});
 var map={};Object.keys(ENTRY[key]||{}).forEach(function(k){map[norm(k)]=ENTRY[key][k]});
 var html='<div class="formhead"><h2>'+esc(T("form."+key+".title"))+'</h2><p><span class="req-note">*</span> '+esc(T("form.required"))+' <span class="binote">'+esc(T("form.biNote"))+'</span></p></div>'+
  '<form novalidate autocomplete="off" data-key="'+key+'" id="panel-'+key+'" role="tabpanel" aria-labelledby="tab-'+key+'" hidden>'+
  secs.map(function(sc){return'<div class="sec"><h3>'+esc(sc.t)+'</h3>'+(sc.n?'<div class="callout" role="note"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg><div><strong>'+esc(sc.n[0])+'</strong><p>'+esc(sc.n[1])+'</p></div></div>':'')+'<div class="grid">'+sc.specs.map(function(s){return fieldHTML(key,s)}).join("")+'</div></div>'}).join("")+
  '<input class="hp" type="text" name="hp_x7" tabindex="-1" autocomplete="off" aria-hidden="true">'+
  '<div class="notice" role="alert" id="n-'+key+'">'+esc(T("err.submit"))+'</div>'+
  '<div class="step3"><div><h3>'+esc(T("step3.title"))+'</h3><p>'+esc(T("step3.text"))+'</p></div></div>'+
  '<div class="actions"><button class="submit" type="submit" disabled><span class="spin"></span><span class="lbl">'+esc(T("btn.submit"))+'</span></button><button class="clear" type="button" data-clear>'+esc(T("btn.clearForm"))+'</button><span class="small need" aria-live="polite">'+esc(T("need.ready"))+'</span></div>'+
  '<p class="trust"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg><span>'+esc(T("trust.text"))+'</span></p>'+
  '<p class="dsv" aria-live="polite"></p></form>';
 var wrap=document.createElement("section");wrap.className="fw";wrap.dataset.key=key;wrap.hidden=true;wrap.innerHTML=html;
 // formhead sits outside <form>; keep both inside wrapper
 panels.appendChild(wrap);
 var F_={key:key,el:$("form",wrap),box:wrap,specs:specs,by:by,secs:secs,map:map};
 state[key]=F_;
 wireCommon(F_);
 F_.el.addEventListener("submit",function(e){submit(F_,e)});
 wireImages(F_);
 $("[data-clear]",wrap).addEventListener("click",function(){askClear(F_)});
 draftRestore(F_);
 F_.el.hidden=false;
 var b=document.createElement("button");
 b.className="tab";b.type="button";b.setAttribute("role","tab");b.id="tab-"+key;b.style.setProperty("--c",def.color);b.setAttribute("aria-controls","panel-"+key);
 b.setAttribute("aria-disabled","true");b.innerHTML="<i></i>"+esc(tabName(key))+'<span class="tkd" aria-hidden="true"></span>';b.addEventListener("click",function(){if(!unlocked){needBI();return}select(key)});
 b.addEventListener("keydown",function(e){var i=ORDER.indexOf(key),n=e.key==="ArrowRight"?i+1:e.key==="ArrowLeft"?i-1:null;if(n===null)return;e.preventDefault();if(!unlocked)return;n=(n+3)%3;select(ORDER[n]);$("#tab-"+ORDER[n]).focus()});
 tabs.appendChild(b);
}

/* ---------- State helpers ---------- */
/* Small helpers: wrapOf = the HTML block of a field, get = its current answer, vis/shown = is it visible, setErr = show an error. */
function wrapOf(F_,s){return $('[data-id="'+s.id+'"]',F_.el)}
function get(F_,s){
 var w=wrapOf(F_,s);
 if(s.type==="radio"){var c=$("input:checked",w);return c?c.value:""}
 if(s.type==="check")return $$("input:checked",w).map(function(i){return i.value});
 if(s.type==="ack")return $("input",w).checked?"Yes":"";
 return $(".c",w).value.trim();
}
function vis(F_,s){var g=function(id){return get(F_,F_.by[id])};return(!s.show||s.show(g))&&(!s.enable||s.enable(g))}
function shown(F_,s){return!s.show||s.show(function(id){return get(F_,F_.by[id])})}
function setErr(w,m){w.classList.toggle("bad",!!m);$(".err",w).textContent=m;$$("input,select,textarea",w).forEach(function(c){m?c.setAttribute("aria-invalid","true"):c.removeAttribute("aria-invalid")})}
/* "?" help buttons: tap to show or hide the one-line explanation (works on touch screens, no hover needed). */
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".qm");if(!b)return;e.preventDefault();
 var p=document.getElementById(b.getAttribute("aria-controls")),open=b.getAttribute("aria-expanded")==="true";
 b.setAttribute("aria-expanded",String(!open));if(p)p.hidden=open;var f=b.closest(".f");if(f)f.classList.toggle("helpopen",!open)});
/* Re-checks the form while the customer types, saves a draft, and validates a field when they leave it. */
function wireCommon(F_){
 F_.el.addEventListener("input",function(){refresh(F_);saveSoon(F_);if(F_.key==="bi")gate()});
 F_.el.addEventListener("change",function(){refresh(F_);saveSoon(F_);if(F_.key==="bi")gate()});
 F_.el.addEventListener("focusout",function(e){var w=e.target.closest&&e.target.closest("[data-id]");if(!w||w.classList.contains("hide"))return;var s=F_.by[w.dataset.id];
  if(s.type==="radio"||s.type==="check"||s.type==="ack")return;if(s.type==="imglink"&&!(e.target.classList&&e.target.classList.contains("c")))return;if(get(F_,s)||w.classList.contains("bad"))setErr(w,check(s,get(F_,s)));
  /* soft green tick once a field holds a valid answer */
  w.classList.toggle("ok",!!get(F_,s)&&!check(s,get(F_,s)))});
}
/* Applies the show/hide rules (for example WABA = No hides the Business Manager ID) and updates Submit and progress. */
function refresh(F_){
 F_.specs.forEach(function(s){if(!s.show&&!s.enable)return;var w=wrapOf(F_,s),sh=shown(F_,s),v=vis(F_,s);w.classList.toggle("hide",!sh);w.classList.toggle("off",sh&&!v);$$("input,select,textarea",w).forEach(function(c){c.disabled=!v});if(!v)setErr(w,"")});
 syncSubmit(F_);
 $$(".sec",F_.el).forEach(function(sc){var it=$$("[data-id]",sc);sc.classList.toggle("hide",it.length>0&&it.every(function(w){return w.classList.contains("hide")}))});
 paint();
}
/* Counts completed and total visible fields; drives the progress bar and the Submit button. */
function stat(F_){var done=0,total=0;F_.specs.forEach(function(s){if(!vis(F_,s))return;total++;if(check(s,get(F_,s))==="")done++});return{done:done,total:total}}
/* Redraws the progress panel on the right. */
function paint(){
 if(!state.bi||!ORDER.every(function(k){return state[k]}))return;
 var cur=unlocked?state[active]:state.bi,c=stat(cur),pct=c.total?Math.round(c.done/c.total*100):0;
 $("#bar").style.width=pct+"%";$("#meter").setAttribute("aria-valuenow",pct);
 $("#count").textContent=T(c.total===1?"count.one":"count.other",{tab:unlocked?tabName(active):T("prog.bi"),done:c.done,total:c.total});
 var rows='<li class="'+(unlocked?"ok":"")+'"><b></b><span>'+esc(T("prog.bi"))+'</span><em>'+esc(unlocked?T("prog.complete"):T("prog.inprogress"))+'</em></li>';
 ORDER.forEach(function(k){var st=stat(state[k]),done=submitted[k],t=$("#tab-"+k);
  rows+='<li class="'+(done?"ok":"")+'"><b></b><span>'+esc(tabName(k))+'</span><em>'+esc(done?T("prog.submitted"):unlocked?(st.done?T("prog.of",{done:st.done,total:st.total}):T("prog.notstarted")):T("prog.locked"))+'</em></li>';
  if(t)t.classList.toggle("done",!!done)});
 $("#chk").innerHTML=rows;
 /* Sticky progress bar chips and overall percentage: Business info + 3 channels */
 var chips='<li class="'+(unlocked?"ok":"cur")+'"><b></b>'+esc(T("prog.bi"))+'</li>',nsub=0;
 ORDER.forEach(function(k){var st=stat(state[k]),d=submitted[k];if(d)nsub++;
  var isCur=unlocked&&k===active&&!d;chips+='<li class="'+(d?"ok":isCur?"cur":"")+'"><b></b>'+esc(tabName(k))+'<em>'+esc(d?"\u2713":isCur?st.done+"/"+st.total:"")+'</em></li>'});
 var all=Math.round(((unlocked?1:0)+nsub)/(1+ORDER.length)*100);
 $("#sb-chips").innerHTML=chips;var cc=$("#sb-chips"),cu=$("li.cur:last-child,li.cur",cc);if(cu&&cc.scrollWidth>cc.clientWidth)cc.scrollLeft=Math.max(0,cu.offsetLeft-cc.clientWidth/2+cu.offsetWidth/2);$("#sb-pct").textContent=all+"%";$("#sb-bar").style.width=all+"%";
 /* Hero step strip: step 1 done when business info confirmed, 2 when any channel submitted, 3 when all submitted */
 var dn=[unlocked,nsub>0,nsub===ORDER.length],seen=false;
 $$("#hsteps li").forEach(function(li,i){li.classList.toggle("done",dn[i]);var cur=!dn[i]&&!seen;if(cur)seen=true;li.classList.toggle("cur",cur)});
}
/* The sticky bar slides in once the header has scrolled out of view. */
(function(){var sb=$("#sbar"),tk=0;function on(){tk=0;var show=window.scrollY>300;sb.classList.toggle("show",show);sb.setAttribute("aria-hidden",String(!show))}
 window.addEventListener("scroll",function(){if(!tk)tk=requestAnimationFrame(on)},{passive:true});on()})();
/* Submit stays disabled until every visible field is valid and the device is online. */
function syncSubmit(F_){
 if(F_.key==="bi"||F_.sending)return;var btn=$(".submit",F_.el);if(!btn)return;
 var c=stat(F_),left=c.total-c.done,off=!online();btn.disabled=left>0||off;
 var n=$(".need",F_.el);if(n)n.textContent=left>0?T(left===1?"need.one":"need.other",{n:left}):off?T("need.offline"):T("need.ready")}
var biCollapsed=false;
function updateSummary(){var B=state.bi,g=function(id){return get(B,B.by[id])};var sm=[g("co"),g("pc")?T("bi.summary.spoc",{name:g("pc")}):"",g("email"),g("mob")].filter(Boolean).map(function(x){return"<span>"+esc(x)+"</span>"}).join("");$("#bisum").innerHTML=sm||"<span>"+esc(T("bi.summary.empty"))+"</span>"}
/* Collapses or expands the business information card (it collapses after Continue). */
function setBICollapsed(on,instant){
 var h=$("#bi"),f=$("#bi-form"),t=$("#bi-toggle");if(!h||!f)return;if(instant)h.classList.add("noanim");
 biCollapsed=on;h.classList.toggle("collapsed",on);f.inert=on;f.setAttribute("aria-hidden",on?"true":"false");
 t.setAttribute("aria-expanded",String(!on));$(".bt-l",t).textContent=on?T("btn.expand"):T("btn.collapse");$("#bisum").hidden=!on;$(".bi-note",h).hidden=on;if(on)updateSummary();
 if(instant)setTimeout(function(){h.classList.remove("noanim")},80);
}
function needBI(){var d=$("#needbi");typeof d.showModal==="function"?d.showModal():d.setAttribute("open","");$("#nbgo").focus()}
/* Continue button: validates business information, then unlocks the channels. */
function continueBI(){
 var B=state.bi,first=null;B.specs.forEach(function(s){var w=wrapOf(B,s),m=check(s,get(B,s));setErr(w,m);if(m&&!first)first=w});
 if(first){setBICollapsed(false,true);confirmed=false;try{localStorage.removeItem(BIOK)}catch(e){}gate();first.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});var c=$("input,select,textarea",first);if(c)c.focus({preventScroll:true});return}
 confirmed=true;try{localStorage.setItem(BIOK,"1")}catch(e){}gate();setBICollapsed(true,true);
 $("#step2").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});var t=$("#tab-"+active);if(t)t.focus({preventScroll:true});
}
function biValid(){var B=state.bi;return B.specs.every(function(s){return check(s,get(B,s))===""})}
function showActive(){ORDER.forEach(function(k){state[k].box.hidden=!(unlocked&&k===active)})}
/* Locks or unlocks the channel tabs depending on whether business information is complete and confirmed. */
function gate(){
 var ok=confirmed&&biValid();unlocked=ok;
 var B=state.bi,filled=B.specs.every(function(s){var v=get(B,s);return Array.isArray(v)?v.length>0:!!v});
 $$("#tabs .tab").forEach(function(t){t.setAttribute("aria-disabled",String(!ok));t.classList.toggle("locked",!ok);t.title=ok?"":T("lock.tip")});
 $$(".tn button").forEach(function(b){b.classList.toggle("locked",!ok)});
 $("#tabs").classList.toggle("locked",!ok);$("#step2").classList.toggle("locked",!ok);$("#lock").hidden=ok;
 $("#bi").classList.toggle("done",ok);$("#bi-go").hidden=!filled;
 /* once the business information is confirmed, "Clear" is replaced by "Fill different business info" (full restart) */
 $("#bi-clear").hidden=ok;$("#bi-new").hidden=!ok;
 var st=$("#bistat");st.textContent=ok?T("bi.status.ok"):confirmed?T("bi.status.fix"):filled?T("bi.status.filled"):T("bi.status.empty");st.className="bistat"+(ok?" ok":"");
 showActive();paint();
}
/* Switches to a channel tab and remembers the choice. */
function select(key){
 active=key;try{localStorage.setItem("pind_onboarding_tab_v1",key)}catch(e){}$$(".tn button").forEach(function(b){b.setAttribute("aria-current",b.dataset.k===key)});
 ORDER.forEach(function(k){var on=k===key,t=$("#tab-"+k);t.setAttribute("aria-selected",on);t.tabIndex=on?0:-1});
 showActive();refresh(state[key]);
}
/* Builds the shared business information form (step 1). */
function buildBI(){
 var host=$("#bi"),specs=BI_DEF.specs,by={};specs.forEach(function(s){by[s.id]=s});
 host.innerHTML='<div class="formhead bi-head"><div class="bi-ht"><h2>'+esc(T("bi.title"))+'<span class="okpill">'+esc(T("bi.confirmed"))+'</span></h2><p class="bi-note"><span class="req-note">*</span> '+esc(T("bi.note"))+'</p><p class="bi-sum" id="bisum" hidden></p><button class="clear bi-new" type="button" id="bi-new" hidden>'+esc(T("btn.newBI"))+'</button></div>'+
  '<button type="button" class="bi-toggle" id="bi-toggle" aria-expanded="true" aria-controls="bi-form"><span class="bt-l">'+esc(T("btn.collapse"))+'</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10l4.5-4.5L12.5 10"/></svg></button></div>'+
  '<form novalidate id="bi-form" class="bi-body"><div class="inner"><div class="bp">'+BI_DEF.groups.map(function(g,gi){return'<div class="sec"><h3>'+esc(T("bi.group."+gi))+'</h3><div class="grid">'+g.map(function(s){return fieldHTML("bi",s)}).join("")+'</div></div>'}).join("")+
  '<div class="actions"><span class="bistat" id="bistat" aria-live="polite"></span><span class="dsv" aria-live="polite"></span><button class="clear" type="button" id="bi-clear">'+esc(T("btn.clear"))+'</button><button class="submit" type="submit" id="bi-go">'+esc(T("btn.continue"))+'</button></div></div></div></form>';
 var F_={key:"bi",el:$("#bi-form"),box:host,specs:specs,by:by,secs:BI_DEF.groups.map(function(g,gi){return{t:T("bi.group."+gi),specs:g}}),map:{}};
 state.bi=F_;wireCommon(F_);
 $("#bi-toggle").addEventListener("click",function(){setBICollapsed(!biCollapsed)});
 $("#bi-clear").addEventListener("click",function(){askClear(F_)});
 $("#bi-new").addEventListener("click",function(){askClear(F_,"newbi")});
 F_.el.addEventListener("submit",function(e){e.preventDefault();continueBI()});
 draftRestore(F_);
}

/* ---------- Image link / upload (RCS logo and banner) ---------- */
var IMG_ERR={type:T("err.img.type"),net:T("err.img.net"),off:T("err.img.off")};
function readAs(file,how,to){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=rej;if(how==="buf")r.readAsArrayBuffer(file.slice(0,to));else r.readAsDataURL(file)})}
function imgSize(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){res({w:i.naturalWidth,h:i.naturalHeight,u:u})};i.onerror=function(){URL.revokeObjectURL(u);rej(new Error("type"))};i.src=u})}
function clearImg(w){w._seq=(w._seq||0)+1;delete w.dataset.busy;$(".c",w).value="";$(".up input",w).value="";if(w._url){URL.revokeObjectURL(w._url);w._url=null}$(".fi",w).hidden=true;var st=$(".st",w);st.textContent="";st.className="st"}
function imgSet(F_,s,w,mode){s._mode=mode;$$(".seg button",w).forEach(function(b){var on=b.dataset.m===mode;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});$(".c",w).hidden=mode==="upload";$(".up",w).hidden=mode!=="upload";clearImg(w);setErr(w,"");refresh(F_)}
/* Handles a chosen RCS image: checks type, size and dimensions in the browser, then uploads it and stores the returned link. */
function onFile(F_,s,w,file){
 var seq=(w._seq=(w._seq||0)+1),st=$(".st",w),rule=(CFG.IMAGE_RULES||{})[s.kind]||{};
 function fail(m){if(seq!==w._seq)return;clearImg(w);setErr(w,m);refresh(F_)}
 setErr(w,"");if(!file)return;
 if(!/\.jpe?g$/i.test(file.name)||(file.type&&file.type!=="image/jpeg"))return fail(IMG_ERR.type);
 if(rule.maxKB&&file.size>rule.maxKB*1024)return fail(T("err.img.size",{kb:rule.maxKB,have:Math.ceil(file.size/1024)}));
 readAs(file,"buf",3).then(function(b){var a=new Uint8Array(b);if(!(a[0]===255&&a[1]===216&&a[2]===255))throw new Error("type");return imgSize(file)}).then(function(d){
  if(seq!==w._seq){URL.revokeObjectURL(d.u);return}
  if(rule.width&&(d.w!==rule.width||d.h!==rule.height)){URL.revokeObjectURL(d.u);throw new Error("dim:"+d.w+" \u00D7 "+d.h)}
  w._url=d.u;$(".fi img",w).hidden=false;$(".fi img",w).src=d.u;$(".fn",w).textContent=file.name;$(".fi",w).hidden=false;
  st.textContent=T("img.uploading");st.className="st busy";w.dataset.busy="1";
  if(!CFG.UPLOAD_URL)throw new Error("off");
  return readAs(file,"url").then(function(u){return fetchT(CFG.UPLOAD_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({kind:s.kind,name:file.name,mime:"image/jpeg",data:u.split(",")[1]})})})
   .then(function(r){return r.json()}).then(function(j){if(seq!==w._seq)return;if(!j||!j.ok||!j.url){console.error("[Onboarding] upload rejected:",j);throw new Error("srv:"+((j&&j.error)||"unknown"))}
    $(".c",w).value=j.url;delete w.dataset.busy;st.textContent=T("img.uploaded");st.className="st ok";refresh(F_);saveSoon(F_)});
 }).catch(function(e){var m=(e&&e.message)||"";
  if(m!=="type"&&m.indexOf("dim:")!==0&&m!=="off")console.error("[Onboarding] upload failed:",e);
  var ref=m.indexOf("srv:")===0?m.slice(4):(e&&e.name==="AbortError"?"timeout":e&&e.name==="SyntaxError"?"resp":"net");
  fail(m==="type"?IMG_ERR.type:m.indexOf("dim:")===0?T("err.img.dim",{w:rule.width,h:rule.height,have:m.slice(4)}):m==="off"?IMG_ERR.off:IMG_ERR.net+T("err.ref",{code:"UPL-"+ref.toUpperCase()}))});
}
function wireImages(F_){F_.specs.forEach(function(s){if(s.type!=="imglink")return;var w=wrapOf(F_,s);s._mode="link";
 $$(".seg button",w).forEach(function(b){b.addEventListener("click",function(){imgSet(F_,s,w,b.dataset.m)})});
 $(".up input",w).addEventListener("change",function(e){onFile(F_,s,w,e.target.files[0])});
 $(".rm",w).addEventListener("click",function(){clearImg(w);refresh(F_)})})}
function resetImages(F_){F_.specs.forEach(function(s){if(s.type==="imglink")imgSet(F_,s,wrapOf(F_,s),"link")})}

/* ---------- Draft: answers are kept in this browser until the form is submitted or cleared ---------- */
var DKEY="pind_onboarding_draft_v1_",DAYS=30,saveT={},lastKey="",pendingKey="";
/* Drafts: answers are saved in this browser (localStorage) for 30 days, until submitted or cleared. Failures are ignored. */
function draftSave(F_){try{var d={};F_.specs.forEach(function(s){var w=wrapOf(F_,s);
 d[s.id]=s.type==="imglink"?{m:s._mode||"link",v:get(F_,s),n:$(".fn",w).textContent}:get(F_,s)});
 localStorage.setItem(DKEY+F_.key,JSON.stringify({t:Date.now(),d:d}));draftNote(F_)}catch(e){}}
/* Small "Draft saved" cue so customers know their answers are kept on this device. */
function draftNote(F_){var n=F_.el&&$(".dsv",F_.el);if(!n)return;n.textContent=T("draft.saved");n.classList.remove("flash");void n.offsetWidth;n.classList.add("flash")}
function saveSoon(F_){clearTimeout(saveT[F_.key]);saveT[F_.key]=setTimeout(function(){draftSave(F_)},300)}
function draftClear(key){clearTimeout(saveT[key]);try{localStorage.removeItem(DKEY+key)}catch(e){}}
function draftRestore(F_){
 var raw,o;try{raw=localStorage.getItem(DKEY+F_.key)}catch(e){return}
 if(!raw)return;try{o=JSON.parse(raw)}catch(e){return}
 if(!o||!o.d||Date.now()-o.t>DAYS*864e5){draftClear(F_.key);return}
 F_.specs.forEach(function(s){var v=o.d[s.id],w=wrapOf(F_,s);if(v==null)return;
  if(s.type==="radio")$$("input",w).forEach(function(i){i.checked=i.value===v});
  else if(s.type==="check")$$("input",w).forEach(function(i){i.checked=Array.isArray(v)&&v.indexOf(i.value)>-1});
  else if(s.type==="imglink"){imgSet(F_,s,w,v.m==="upload"?"upload":"link");
   if(v.v){$(".c",w).value=v.v;if(v.m==="upload"){$(".fn",w).textContent=v.n||T("img.uploadedName");$(".fi img",w).hidden=true;$(".fi",w).hidden=false;var st=$(".st",w);st.textContent=T("img.uploaded");st.className="st ok"}}}
  else if(s.type==="ack")$("input",w).checked=v==="Yes";
  else if(typeof v==="string"){var c=$(".c",w);if(!c)return;if(s.type==="select"&&$$("option",c).every(function(op){return op.value!==v}))return;c.value=v}});
 refresh(F_);
}
/* Empties a form and removes its saved draft. */
function resetForm(F_){F_.el.reset();resetImages(F_);F_.specs.forEach(function(s){setErr(wrapOf(F_,s),"")});var n_=$("#n-"+F_.key);if(n_)n_.classList.remove("on");if(F_.key==="bi"){confirmed=false;try{localStorage.removeItem(BIOK)}catch(e){}setBICollapsed(false,true)}refresh(F_);draftClear(F_.key)}
/* Confirm dialog before clearing. mode: "clear" (empty this form), "another" (empty a channel form to fill it again with
   different information) or "newbi" (clear business information and every channel form, and restart from the beginning). */
var pendingMode="clear";
function askClear(F_,mode){pendingKey=F_.key;pendingMode=mode||"clear";
 var m=pendingMode;$("#ct").textContent=T(m==="another"?"another.title":m==="newbi"?"newbi.title":"clear.title");
 $("#clear p").textContent=m==="another"?T("another.text",{tab:tabName(F_.key)}):m==="newbi"?T("newbi.text"):F_.key==="bi"?T("clear.bi"):T("clear.form");
 $("#cyes").textContent=m==="clear"?T("btn.clearForm"):T("another.go");var d=$("#clear");typeof d.showModal==="function"?d.showModal():d.setAttribute("open","");$("#cno").focus()}
function closeDlg(d){d.close?d.close():d.removeAttribute("open")}
$("#nbgo").addEventListener("click",function(){
 closeDlg($("#needbi"));setBICollapsed(false,true);var B=state.bi,bad=B.specs.filter(function(s){return check(s,get(B,s))!==""})[0],w=bad?wrapOf(B,bad):null;
 (w||$("#bi")).scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});var c=w&&$("input,select,textarea",w);if(c)c.focus({preventScroll:true})});
$("#needbi").addEventListener("click",function(e){if(e.target===this)closeDlg(this)});
document.addEventListener("pi:needbi",needBI);
$("#cno").addEventListener("click",function(){closeDlg($("#clear"))});
/* Clear everything and restart: business information, every channel form, saved drafts and the "submitted" marks. */
function fullReset(){
 ORDER.forEach(function(k){resetForm(state[k])});resetForm(state.bi);
 submitted={};try{sessionStorage.removeItem("pind_onboarding_done_v1")}catch(e){}try{localStorage.removeItem("pind_onboarding_tab_v1")}catch(e){}
 gate();select(ORDER[0]);paint();window.scrollTo({top:0,behavior:reduce?"auto":"smooth"})}
$("#cyes").addEventListener("click",function(){var F_=state[pendingKey],m=pendingMode;closeDlg($("#clear"));if(!F_)return;
 if(m==="newbi"){fullReset();return}
 resetForm(F_);
 if(m==="another"){submitted[F_.key]=0;try{sessionStorage.setItem("pind_onboarding_done_v1",JSON.stringify(submitted))}catch(e){}paint()}
 if(F_.key==="bi")gate();F_.box.scrollIntoView({block:"start",behavior:reduce?"auto":"smooth"})});
$("#clear").addEventListener("click",function(e){if(e.target===this)closeDlg(this)});

/* ---------- Network helpers and loading overlay ---------- */
/* fetch with a time limit. After NET.TIMEOUT_MS the request is aborted (name "AbortError"). */
function fetchT(url,opts,ms){
 if(!window.AbortController)return fetch(url,opts);
 var c=new AbortController(),t=setTimeout(function(){c.abort()},ms||NET.TIMEOUT_MS);opts.signal=c.signal;
 return fetch(url,opts).then(function(r){clearTimeout(t);return r},function(e){clearTimeout(t);throw e});
}
var busyT=null;
/* Show or hide the full-screen "Submitting" overlay. After NET.SLOW_MS it adds a note about the slow connection. */
function busy(on){var b=$("#busy"),sl=$("#bslow");if(!b)return;clearTimeout(busyT);sl.hidden=true;b.hidden=!on;document.body.style.overflow=on?"hidden":"";
 if(on){$("#bd").textContent=T("busy.text");if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();busyT=setTimeout(function(){sl.hidden=false},NET.SLOW_MS)}}

/* ---------- Connection handling ---------- */
/* online() is false only when the browser is sure there is no connection. */
function online(){return navigator.onLine!==false}
/* Banner at the top of the page. kind: "offline" (stays), "back" (hides after 4 s) or "slow" (hides after 8 s). */
var netT=null;
function netShow(kind){
 var b=$("#net");if(!b)return;clearTimeout(netT);
 $("#net-t").textContent=kind==="offline"?T("net.offline.title"):kind==="back"?T("net.back"):T("net.slow");
 $("#net-x").textContent=kind==="offline"?T("net.offline.text"):"";
 b.className="net "+kind;b.hidden=false;
 if(kind!=="offline")netT=setTimeout(function(){b.hidden=true},kind==="back"?4000:8000)}
/* Keeps the Submit buttons and the banner in step with the connection. */
function onNet(){
 if(online())netShow("back");else netShow("offline");
 ORDER.forEach(function(k){if(state[k])syncSubmit(state[k])})
}
window.addEventListener("offline",onNet);
window.addEventListener("online",onNet);
/* Runs an upload or submission and repeats it after a real network failure (not after a timeout, which could
   create a duplicate). The wait doubles each time and has a random part so many visitors do not retry together. */
function withRetry(make){
 var n=0,max=NET.MAX_RETRIES;
 function go(){return make().catch(function(err){
  var netFail=err&&err.name==="TypeError";
  if(netFail&&n<max&&online()){n++;
   var wait=NET.RETRY_BASE_MS*Math.pow(2,n-1)*(1+Math.random()*.5);
   $("#bd").textContent=T("busy.retry",{n:n,max:max});
   return new Promise(function(r){setTimeout(r,wait)}).then(go)}
  throw err})}
 return go()}

/* ---------- Send to a Google Sheet (through the Apps Script web app) ---------- */
/* Builds the row sent to the Google Sheet route: question title -> answer, with "N/A" for hidden and removed questions. */
function sheetRecord(F_){var rec={},B=state.bi,bm=BI_MAP[F_.key]||{};
 Object.keys(bm).forEach(function(id){var t=bm[id];rec[t==="emailAddress"?"Email Address":t]=get(B,B.by[id])});
 F_.specs.forEach(function(s){var on=vis(F_,s),v=on?get(F_,s):"N/A";if(on&&s.opt&&!v)v="N/A";rec[norm(s.title||s.label)]=Array.isArray(v)?v.join(", "):v});
 (CFG.NA_ANSWERS&&CFG.NA_ANSWERS[F_.key]||[]).forEach(function(t){rec[norm(t)]=CFG.NA_VALUE||"N/A"});return rec}
/* Posts the row to the Apps Script web app and checks its JSON answer. */
function sendSheet(F_){
 if(!CFG.SHEET_URL)return Promise.reject(new Error("config"));
 return fetchT(CFG.SHEET_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({form:F_.key,data:sheetRecord(F_)})})
  .then(function(r){return r.json()}).then(function(j){if(!j||!j.ok){console.error("[Onboarding] sheet rejected:",j);throw new Error("srv:"+((j&&j.error)||"unknown"))}})}

/* ---------- Submit ---------- */
/* Submit: validates everything again, builds the Google Form payload (entry.NNN -> answer, "N/A" for hidden or removed
   questions), sends it with retries, then shows the thank-you or an error that keeps the answers. */
function submit(F_,e){
 e.preventDefault();
 if(F_.sending||$(".submit",F_.el).disabled)return;
 var first=null,btn=$(".submit",F_.el),note=$("#n-"+F_.key);note.classList.remove("on");
 /* No connection: keep everything the customer typed and ask them to reconnect. */
 if(!online()){note.textContent=T("err.offline");note.classList.add("on");note.scrollIntoView({block:"center"});return}
 var B=state.bi,bfirst=null;B.specs.forEach(function(s){var w=wrapOf(B,s),m=check(s,get(B,s));setErr(w,m);if(m&&!bfirst)bfirst=w});
 if(bfirst){setBICollapsed(false,true);gate();bfirst.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});var bc=$("input,select,textarea",bfirst);if(bc)bc.focus({preventScroll:true});return}
 F_.specs.forEach(function(s){var w=wrapOf(F_,s);if(!vis(F_,s)){setErr(w,"");return}var m=w.dataset.busy?T("err.uploadWait"):check(s,get(F_,s));setErr(w,m);if(m&&!first)first=w});
 if(first){first.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});var c=$("input,select,textarea",first);if(c)c.focus({preventScroll:true});return}

 var toSheet=((CFG.TARGETS||{})[F_.key]||"form")==="sheet";
 var p=new URLSearchParams(),miss=[],noNA=!!(CFG.SEND_NA&&CFG.SEND_NA[F_.key]===false);
 F_.specs.forEach(function(s){
  var shown=vis(F_,s),v=shown?get(F_,s):"N/A",key=F_.map[norm(s.title||s.label)];
  /* Forms with SEND_NA:false: a hidden question, or an optional one left empty, is not sent at all */
  if(noNA&&(!shown||(s.opt&&!v)))return;
  if(shown&&s.opt&&!v)v="N/A";
  if(!shown&&s.type==="select"){if(!HIDDEN_SELECT_VALUE)return;v=HIDDEN_SELECT_VALUE}
  if(!key){miss.push(s.label);return}
  if(s.type==="date"){var d=v.split("-");p.append(key+"_year",d[0]);p.append(key+"_month",d[1]);p.append(key+"_day",d[2])}
  else if(Array.isArray(v)){v.forEach(function(x){p.append(key,x)});p.append(key+"_sentinel","")}
  else p.append(key,v);
 });
 var bmap=BI_MAP[F_.key]||{};
 Object.keys(bmap).forEach(function(id){var t=bmap[id],k=t==="emailAddress"?"emailAddress":F_.map[norm(t)];if(!k){if(id!=="am")miss.push(t);return}p.append(k,get(B,B.by[id]))});
 (CFG.NA_ANSWERS&&CFG.NA_ANSWERS[F_.key]||[]).forEach(function(t){var k=F_.map[norm(t)];if(k)p.append(k,CFG.NA_VALUE||"N/A")});
 p.append("fvv","1");p.append("pageHistory","0");
 F_.sending=true;btn.classList.add("sending");btn.disabled=true;$(".lbl",btn).textContent=T("btn.submitting");if(!debug||toSheet)busy(true);

 if(debug&&!toSheet){/* opens Google's own response page in a new tab so you can read its exact message */
  var act="https://docs.google.com/forms/d/e/"+FORM_IDS[F_.key]+"/formResponse",f=document.createElement("form");
  f.method="POST";f.action=act;f.target="_blank";f.style.display="none";
  p.forEach(function(v,k){var i=document.createElement("input");i.type="hidden";i.name=k;i.value=v;f.appendChild(i)});
  document.body.appendChild(f);f.submit();f.remove();F_.sending=false;btn.classList.remove("sending");$(".lbl",btn).textContent=T("btn.submit");syncSubmit(F_);return}

 var send,hp=$(".hp",F_.el);
 if(CFG.HONEYPOT!==false&&hp&&hp.value)send=new Promise(function(r){setTimeout(r,800)});   /* a bot filled the hidden field: pretend success, send nothing */
 else if(preview)send=new Promise(function(r){setTimeout(r,700)});
 else if(toSheet)send=withRetry(function(){return sendSheet(F_)});
 else if(miss.length){console.error("Onboarding form is missing Google Form entry IDs for:",miss);send=Promise.reject(new Error("config"))}
 /* mode "no-cors": Google does not let the page read the reply, so success means "the request was delivered". */
 else send=withRetry(function(){return fetchT("https://docs.google.com/forms/d/e/"+FORM_IDS[F_.key]+"/formResponse",{method:"POST",mode:"no-cors",body:p})});

 send.then(function(){
  busy(false);lastKey=F_.key;draftClear(F_.key);submitted[F_.key]=1;try{sessionStorage.setItem("pind_onboarding_done_v1",JSON.stringify(submitted))}catch(e){}
  var rem=ORDER.filter(function(k){return!submitted[k]}).map(tabName),dn=$("#dnote");dn.hidden=!rem.length;dn.textContent=rem.length?T("done.also",{list:rem.join(T("list.sep"))}):"";paint();
  var dlg=$("#done");typeof dlg.showModal==="function"?dlg.showModal():dlg.setAttribute("open","");$("#ok").focus();
 }).catch(function(err){busy(false);console.error("[Onboarding] submit failed:",err);var em=(err&&err.message)||"",code=(em==="config"?"CFG":em.indexOf("srv:")===0?"SRV-"+em.slice(4).toUpperCase():err&&err.name==="AbortError"?"TIMEOUT":err&&err.name==="SyntaxError"?"RESP":"NET")+"-"+F_.key.toUpperCase();note.textContent=(!online()?T("err.offline"):err&&err.name==="AbortError"?T("err.timeout"):T("err.submit"))+T("err.ref",{code:code});note.classList.add("on");note.scrollIntoView({block:"center"})})
 .then(function(){busy(false);F_.sending=false;btn.classList.remove("sending");$(".lbl",btn).textContent=T("btn.submit");syncSubmit(F_)});
}

/* ---------- Reset after confirmation ---------- */
/* After the thank-you is closed: clear the submitted form and move to the next channel that is not submitted yet. */
function resetAll(){if(!lastKey)return;var k=lastKey;lastKey="";resetForm(state[k]);
 var next=ORDER.filter(function(x){return!submitted[x]})[0];
 if(next){select(next);$("#step2").scrollIntoView({behavior:"auto",block:"start"})}else window.scrollTo({top:0,behavior:"auto"});paint()}
$("#ok").addEventListener("click",function(){var d=$("#done");d.close?d.close():d.removeAttribute("open");resetAll()});
$("#done").addEventListener("close",resetAll);
$("#done").addEventListener("click",function(e){if(e.target===this)this.close()});

var sk=$("#sk");if(sk)sk.remove();tabs.innerHTML="";
buildBI();
ORDER.forEach(build);
ORDER.forEach(function(k){var F_=state[k],m=F_.specs.filter(function(s){return!F_.map[norm(s.title||s.label)]}).map(function(s){return s.label});
 Object.keys(BI_MAP[k]).forEach(function(id){var t=BI_MAP[k][id];if(t!=="emailAddress"&&!F_.map[norm(t)])m.push(t)});
 if(m.length&&!preview&&(CFG.TARGETS||{})[k]!=="sheet")console.warn("[Onboarding] "+k+" form: Google entry IDs missing for "+m.length+" field(s).",m)});
var t0="whatsapp";try{var sv=localStorage.getItem("pind_onboarding_tab_v1");if(sv&&state[sv])t0=sv}catch(e){}
select(t0);gate();setBICollapsed(true,true);

/* Connection state at load: show the offline banner, or warn when the browser reports a very slow link or data saver. */
var cn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
if(!online())netShow("offline");
else if(cn&&(cn.saveData||/(^|-)2g$/.test(cn.effectiveType||"")))netShow("slow");

/* Offline support (see sw.js). Only on https, and only if enabled in config.js. */
if(CFG.SERVICE_WORKER!==false&&"serviceWorker" in navigator&&location.protocol==="https:"){
 window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(e){console.warn("[Onboarding] offline support unavailable:",e)})})}
})();

/* Header menu, logo, motion preference and one-time welcome dialog */
(function(){
"use strict";
var LOGO_SRC=(window.PI_CONFIG&&window.PI_CONFIG.LOGO_SRC)||"";
document.querySelectorAll(".tn button").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById("tab-"+b.dataset.k);if(t.getAttribute("aria-disabled")==="true"){document.dispatchEvent(new Event("pi:needbi"));return}t.click();document.getElementById("tabs").scrollIntoView({behavior:"smooth",block:"center"})})});
/* Gentle scroll reveal: main cards fade and rise into view once. Skipped for reduced motion or old browsers. */
(function(){
 if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 var els=document.querySelectorAll(".col>.card,.col>.stephead,.col>.tabs,aside>.card");if(!els.length)return;
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.08,rootMargin:"0px 0px -6% 0px"});
 els.forEach(function(el){el.classList.add("rv");io.observe(el)});
 /* safety: never leave anything hidden if the observer is slow */
 setTimeout(function(){els.forEach(function(el){el.classList.add("in")})},2500);
})();
(function(){
 var l=document.getElementById("logo");
 if(LOGO_SRC){var i=new Image();i.alt=window.PI_T("logo.alt");i.onload=function(){l.removeAttribute("role");l.removeAttribute("aria-label");l.innerHTML="";l.appendChild(i)};i.src=LOGO_SRC}
 if(matchMedia("(prefers-reduced-motion: reduce)").matches){var v=document.querySelector(".scene");if(v&&v.pauseAnimations)v.pauseAnimations()}
})();
(function(){
 var KEY="pind_onboarding_welcome_seen_v1",seen=false;
 try{seen=localStorage.getItem(KEY)==="1"}catch(e){}
 if(seen)return;
 var d=document.getElementById("welcome");if(!d)return;
 function close(){if(d.close)d.close();else d.removeAttribute("open");}
 document.getElementById("wgo").addEventListener("click",close);
 d.addEventListener("click",function(e){if(e.target===d)close()});
 setTimeout(function(){
  try{localStorage.setItem(KEY,"1")}catch(e){}
  if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  document.getElementById("wgo").focus();
 },500);
})();
document.addEventListener("input",function(e){var t=e.target,c=t&&t.nextElementSibling;if(c&&c.classList&&c.classList.contains("cnt"))c.textContent=t.value.length+" / "+c.dataset.cnt});
})();
