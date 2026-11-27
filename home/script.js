const navbar=document.getElementById("navbar"),menuBtn=document.getElementById("menuBtn"),navLinks=document.getElementById("navLinks"),links=document.querySelectorAll(".nav-links a"),sections=document.querySelectorAll("main section"),topBtn=document.getElementById("topBtn");

// ---------- Mobile menu ----------
function closeMenu(){navLinks.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");}
menuBtn.addEventListener("click",function(){menuBtn.setAttribute("aria-expanded",navLinks.classList.toggle("open"));});
links.forEach(function(l){l.addEventListener("click",closeMenu);});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMenu();});

// ---------- Scroll behaviour ----------
function handleScroll(){
  const y=window.scrollY;
  navbar.classList.toggle("scrolled",y>10);
  topBtn.style.display=y>400?"block":"none";
  let current="home";
  sections.forEach(function(s){
    if(!s.hidden&&s.id&&y>=s.offsetTop-120)current=s.id;
  });
  links.forEach(function(l){l.classList.toggle("active",l.getAttribute("href")==="#"+current);});
}
window.addEventListener("scroll",handleScroll,{passive:true});
handleScroll();
topBtn.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"});});

// ---------- Local storage "database" (this browser only) ----------
const USERS_KEY="placementUsers";
let memoryUsers=[];
function getUsers(){
  try{return JSON.parse(localStorage.getItem(USERS_KEY))||[];}catch(e){return memoryUsers;}
}
function saveUsers(users){
  memoryUsers=users;
  try{localStorage.setItem(USERS_KEY,JSON.stringify(users));}catch(e){}
}
function makeSalt(){
  if(window.crypto&&crypto.getRandomValues){
    return Array.from(crypto.getRandomValues(new Uint8Array(8))).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
  }
  return Math.random().toString(36).slice(2);
}
async function hashPassword(password,salt){
  const text=salt+password;
  if(window.crypto&&window.crypto.subtle){
    const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
  }
  // weak fallback for old browsers, demo only
  let h=0;
  for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))|0;
  return "f"+h;
}
async function registerUser(data){
  const users=getUsers(),email=data.email.toLowerCase();
  if(users.some(function(u){return u.email===email;}))return{ok:false,message:"This email is already registered. Try logging in."};
  const salt=makeSalt();
  users.push({name:data.name,email:email,role:data.role,salt:salt,passwordHash:await hashPassword(data.password,salt),createdAt:new Date().toISOString()});
  saveUsers(users);
  return{ok:true};
}
async function loginUser(emailInput,password){
  const email=emailInput.trim().toLowerCase();
  const user=getUsers().find(function(u){return u.email===email;});
  if(!user||(await hashPassword(password,user.salt))!==user.passwordHash)return{ok:false,message:"Invalid email or password."};
  return{ok:true,name:user.name,role:user.role};
}

// ---------- Counting numbers ----------
function countUp(el,target){
  const start=performance.now(),dur=1200;
  function step(now){
    const p=Math.min((now-start)/dur,1);
    el.textContent=Math.floor(p*target);
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function loadStats(){
  const users=getUsers();
  function n(r){return users.filter(function(u){return u.role===r;}).length;}
  countUp(document.getElementById("statStudents"),n("student"));
  countUp(document.getElementById("statRecruiters"),n("recruiter"));
  countUp(document.getElementById("statCoordinators"),n("coordinator"));
}
loadStats();

// ---------- Welcome section ----------
const roleContent={
  student:{label:"student",steps:[["Complete your profile","Add your academic details, skills and resume."],["Browse opportunities","Look through available jobs and internships."],["Apply","Apply to the openings that match your skills."]]},
  recruiter:{label:"recruiter",steps:[["Set up your company","Add your company details and contact information."],["Post openings","Share job and internship openings with students."],["Review applicants","See who applied and shortlist candidates."]]},
  coordinator:{label:"placement coordinator",steps:[["Manage companies","Keep track of the companies visiting the campus."],["Monitor students","See student profiles and application progress."],["Track placements","Keep a record of selections and offers."]]}
};
function showWelcome(name,role,returning){
  const c=roleContent[role]||roleContent.student,box=document.getElementById("steps");
  document.getElementById("greeting").textContent=(returning?"Welcome back, ":"Welcome, ")+name.split(" ")[0]+"!";
  document.getElementById("roleText").textContent=returning?"You are logged in as a "+c.label+".":"Your account has been created as a "+c.label+".";
  box.innerHTML="";
  c.steps.forEach(function(s){
    const card=document.createElement("div"),t=document.createElement("h3"),p=document.createElement("p");
    card.className="step-card";t.textContent=s[0];p.textContent=s[1];
    card.appendChild(t);card.appendChild(p);box.appendChild(card);
  });
  document.getElementById("login").hidden=true;
  document.getElementById("register").hidden=true;
  const w=document.getElementById("welcome");
  w.hidden=false;
  w.scrollIntoView({behavior:"smooth"});
  history.replaceState(null,"","#welcome");
}

// ---------- Registration form ----------
const form=document.getElementById("registerForm"),formStatus=document.getElementById("formStatus");
const rules={
  name:function(v){return v.trim().length>=3;},
  email:function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());},
  role:function(v){return v!=="";},
  password:function(v){return v.length>=8&&/\d/.test(v);}
};
function validateField(f){
  const ok=rules[f.name](f.value);
  f.closest(".form-group").classList.toggle("invalid",!ok);
  f.setAttribute("aria-invalid",!ok);
  return ok;
}
form.querySelectorAll("input,select").forEach(function(f){
  f.addEventListener("blur",function(){validateField(f);});
  f.addEventListener("input",function(){if(f.closest(".form-group").classList.contains("invalid"))validateField(f);});
});
form.addEventListener("submit",async function(e){
  e.preventDefault();
  formStatus.textContent="";formStatus.style.color="";
  let ok=true;
  form.querySelectorAll("input,select").forEach(function(f){if(!validateField(f))ok=false;});
  if(!ok)return;
  const data={name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),role:form.elements.role.value,password:form.elements.password.value};
  const btn=form.querySelector("button[type='submit']");
  btn.disabled=true;
  const r=await registerUser(data);
  if(r.ok){form.reset();loadStats();showWelcome(data.name,data.role,false);}
  else{formStatus.style.color="#c0392b";formStatus.textContent=r.message;}
  btn.disabled=false;
});

// ---------- Jobs and internships (sample data, edit freely) ----------
const openings=[
  {type:"job",title:"Junior Web Developer",company:"TechNova Solutions",location:"Noida",pay:"\u20b9 4,00,000 /year",tags:["engineering"],skills:"HTML, CSS, JavaScript"},
  {type:"job",title:"Data Analyst",company:"InsightWorks",location:"Work From Home",pay:"\u20b9 4,50,000 /year",tags:["data","wfh"],skills:"SQL, Excel, Power BI"},
  {type:"job",title:"Security Analyst Trainee",company:"SecureNet Labs",location:"Gurgaon",pay:"\u20b9 5,00,000 /year",tags:["cyber","engineering"],skills:"Networking, SIEM, Linux"},
  {type:"job",title:"UI/UX Designer",company:"PixelCraft Studio",location:"Delhi",pay:"\u20b9 3,60,000 /year",tags:["design"],skills:"Figma, Prototyping"},
  {type:"job",title:"Software Test Engineer",company:"QualityFirst Tech",location:"Pune",pay:"\u20b9 3,80,000 /year",tags:["engineering"],skills:"Manual testing, Selenium"},
  {type:"job",title:"Customer Support Associate",company:"HelpDesk India",location:"Work From Home",pay:"\u20b9 2,80,000 /year",tags:["wfh","parttime"],skills:"Communication, CRM tools"},
  {type:"job",title:"Java Backend Developer",company:"CloudStack Systems",location:"Hyderabad",pay:"\u20b9 5,50,000 /year",tags:["engineering"],skills:"Java, Spring Boot, MySQL"},
  {type:"job",title:"Python Developer",company:"TechNova Solutions",location:"Noida",pay:"\u20b9 4,80,000 /year",tags:["engineering","data"],skills:"Python, Django, REST APIs"},
  {type:"job",title:"SOC Analyst (L1)",company:"SecureNet Labs",location:"Bangalore",pay:"\u20b9 5,20,000 /year",tags:["cyber"],skills:"Log analysis, Incident response"},
  {type:"job",title:"Penetration Testing Associate",company:"CyberShield Infosec",location:"Gurgaon",pay:"\u20b9 6,00,000 /year",tags:["cyber","engineering"],skills:"Kali Linux, Burp Suite, OWASP"},
  {type:"job",title:"Machine Learning Engineer Trainee",company:"DataSphere AI",location:"Bangalore",pay:"\u20b9 6,50,000 /year",tags:["data","engineering"],skills:"Python, scikit-learn, Statistics"},
  {type:"job",title:"Business Analyst",company:"InsightWorks",location:"Mumbai",pay:"\u20b9 4,60,000 /year",tags:["data","management"],skills:"Excel, SQL, Documentation"},
  {type:"job",title:"Digital Marketing Executive",company:"BrandBoost Media",location:"Delhi",pay:"\u20b9 3,20,000 /year",tags:["marketing"],skills:"SEO, Google Ads, Analytics"},
  {type:"job",title:"Graphic Designer",company:"PixelCraft Studio",location:"Work From Home",pay:"\u20b9 3,00,000 /year",tags:["design","wfh"],skills:"Photoshop, Illustrator"},
  {type:"job",title:"Financial Analyst Trainee",company:"FinEdge Capital",location:"Mumbai",pay:"\u20b9 4,20,000 /year",tags:["finance","management"],skills:"Accounting, Excel, Reporting"},
  {type:"job",title:"HR Executive",company:"PeopleFirst Consulting",location:"Noida",pay:"\u20b9 3,40,000 /year",tags:["management"],skills:"Recruitment, Communication"},
  {type:"job",title:"Mobile App Developer",company:"AppForge Labs",location:"Pune",pay:"\u20b9 5,00,000 /year",tags:["engineering"],skills:"Flutter, Dart, Firebase"},
  {type:"job",title:"Cloud Support Associate",company:"CloudStack Systems",location:"Hyderabad",pay:"\u20b9 4,70,000 /year",tags:["engineering"],skills:"AWS basics, Linux, Networking"},
  {type:"internship",title:"Web Development Intern",company:"CodeBridge",location:"Work From Home",pay:"\u20b9 10,000 /month",tags:["engineering","wfh"],skills:"HTML, CSS, JavaScript"},
  {type:"internship",title:"Cyber Security Intern",company:"SecureNet Labs",location:"Delhi",pay:"\u20b9 12,000 /month",tags:["cyber"],skills:"Networking, Linux basics"},
  {type:"internship",title:"Data Science Intern",company:"InsightWorks",location:"Bangalore",pay:"\u20b9 15,000 /month",tags:["data"],skills:"Python, Pandas, Visualization"},
  {type:"internship",title:"Graphic Design Intern",company:"PixelCraft Studio",location:"Work From Home",pay:"\u20b9 8,000 /month",tags:["design","wfh","parttime"],skills:"Canva, Photoshop"},
  {type:"internship",title:"Python Developer Intern",company:"TechNova Solutions",location:"Noida",pay:"\u20b9 10,000 /month",tags:["engineering","data"],skills:"Python, Git"},
  {type:"internship",title:"Content Writing Intern",company:"WordSmith Media",location:"Work From Home",pay:"Unpaid",tags:["wfh","parttime","marketing"],skills:"Writing, Research, SEO basics"},
  {type:"internship",title:"Ethical Hacking Intern",company:"CyberShield Infosec",location:"Gurgaon",pay:"\u20b9 14,000 /month",tags:["cyber"],skills:"Kali Linux, Nmap, Web security"},
  {type:"internship",title:"Digital Forensics Intern",company:"SecureNet Labs",location:"Delhi",pay:"\u20b9 10,000 /month",tags:["cyber"],skills:"Disk analysis, Cyber law basics"},
  {type:"internship",title:"UI/UX Design Intern",company:"PixelCraft Studio",location:"Delhi",pay:"\u20b9 10,000 /month",tags:["design"],skills:"Figma, User research"},
  {type:"internship",title:"React Developer Intern",company:"CodeBridge",location:"Work From Home",pay:"\u20b9 12,000 /month",tags:["engineering","wfh"],skills:"React, JavaScript, Git"},
  {type:"internship",title:"Full Stack Intern",company:"AppForge Labs",location:"Pune",pay:"\u20b9 13,000 /month",tags:["engineering"],skills:"Node.js, MongoDB, React"},
  {type:"internship",title:"Machine Learning Intern",company:"DataSphere AI",location:"Bangalore",pay:"\u20b9 16,000 /month",tags:["data","engineering"],skills:"Python, TensorFlow basics"},
  {type:"internship",title:"Data Analytics Intern",company:"FinEdge Capital",location:"Work From Home",pay:"\u20b9 9,000 /month",tags:["data","finance","wfh","parttime"],skills:"Excel, SQL, Dashboards"},
  {type:"internship",title:"Social Media Intern",company:"BrandBoost Media",location:"Work From Home",pay:"\u20b9 7,000 /month",tags:["marketing","wfh","parttime"],skills:"Content ideas, Instagram, Canva"},
  {type:"internship",title:"Digital Marketing Intern",company:"BrandBoost Media",location:"Delhi",pay:"\u20b9 8,000 /month",tags:["marketing"],skills:"SEO, Email marketing"},
  {type:"internship",title:"HR Intern",company:"PeopleFirst Consulting",location:"Noida",pay:"\u20b9 6,000 /month",tags:["management","parttime"],skills:"Screening, Coordination"},
  {type:"internship",title:"Software Testing Intern",company:"QualityFirst Tech",location:"Pune",pay:"\u20b9 9,000 /month",tags:["engineering"],skills:"Test cases, Bug reports"},
  {type:"internship",title:"Network Security Intern",company:"CyberShield Infosec",location:"Bangalore",pay:"\u20b9 12,000 /month",tags:["cyber","engineering"],skills:"Firewalls, Packet analysis"}
];
// words searched for each tag, so "cyber" also finds "Security Analyst Trainee"
const tagWords={engineering:"engineering developer",data:"data analytics",cyber:"cyber security",design:"design designer",wfh:"work from home",parttime:"part-time",marketing:"marketing",finance:"finance",management:"management"};

const jobGrid=document.getElementById("jobGrid");
let activeType="job",activeTag="all",keyword="",place="";

function renderOpenings(){
  const list=openings.filter(function(o){
    const text=(o.title+" "+o.company+" "+o.skills+" "+o.tags.map(function(t){return tagWords[t];}).join(" ")).toLowerCase();
    return o.type===activeType&&(activeTag==="all"||o.tags.includes(activeTag))&&text.includes(keyword)&&o.location.toLowerCase().includes(place);
  });
  jobGrid.innerHTML="";
  document.getElementById("resultCount").textContent=list.length+(list.length===1?" opening":" openings")+" found";
  if(!list.length){
    const p=document.createElement("p");
    p.className="no-result";
    p.textContent="No openings match your search. Clear the filters or try another keyword.";
    jobGrid.appendChild(p);
    return;
  }
  list.forEach(function(o){
    const card=document.createElement("div");
    card.className="job-card";
    card.innerHTML='<span class="badge">Actively hiring</span><h3></h3><div class="company"></div><div class="meta"></div><a href="#register" class="btn btn-outline btn-small">Register to apply</a>';
    card.querySelector("h3").textContent=o.title;
    card.querySelector(".company").textContent=o.company;
    const meta=card.querySelector(".meta");
    [o.location,o.pay,"Skills: "+o.skills].forEach(function(line){
      const row=document.createElement("div");
      row.textContent=line;
      meta.appendChild(row);
    });
    jobGrid.appendChild(card);
  });
}

function setActive(items,active){
  items.forEach(function(i){i.classList.toggle("active",i===active);});
}
const tabs=document.querySelectorAll(".tab"),chips=document.querySelectorAll(".chip");
tabs.forEach(function(t){
  t.addEventListener("click",function(){
    setActive(tabs,t);
    tabs.forEach(function(x){x.setAttribute("aria-pressed",x===t);});
    activeType=t.dataset.type;
    renderOpenings();
  });
});
chips.forEach(function(c){
  c.addEventListener("click",function(){
    setActive(chips,c);
    activeTag=c.dataset.tag;
    renderOpenings();
  });
});

function runSearch(k,l){
  keyword=k.trim().toLowerCase();
  place=l.trim().toLowerCase();
  // show results from both types: switch to the tab that has matches
  if(!openings.some(function(o){return o.type===activeType&&o.title.toLowerCase().includes(keyword);})&&keyword){
    const other=activeType==="job"?"internship":"job";
    const t=document.querySelector('.tab[data-type="'+other+'"]');
    if(t)t.click();
  }
  renderOpenings();
}
document.getElementById("heroSearch").addEventListener("submit",function(e){
  e.preventDefault();
  runSearch(document.getElementById("heroKeyword").value,document.getElementById("heroLocation").value);
  document.getElementById("opportunities").scrollIntoView({behavior:"smooth"});
});
document.querySelectorAll("[data-search]").forEach(function(a){
  a.addEventListener("click",function(){
    document.getElementById("heroKeyword").value=a.dataset.search;
    document.getElementById("heroLocation").value="";
    runSearch(a.dataset.search,"");
  });
});

document.getElementById("openCount").textContent=openings.length+"+";
const latest=document.createElement("ul");
openings.slice(0,4).forEach(function(o){
  const li=document.createElement("li"),a=document.createElement("strong"),b=document.createElement("span");
  a.textContent=o.title;b.textContent=o.company;
  li.appendChild(a);li.appendChild(b);latest.appendChild(li);
});
renderOpenings();

// ---------- Login / Register views ----------
const authSections={login:document.getElementById("login"),register:document.getElementById("register")};
function showAuth(which,smooth){
  document.getElementById("welcome").hidden=true;
  Object.keys(authSections).forEach(function(k){authSections[k].hidden=(k!==which);});
  authSections[which].scrollIntoView({behavior:smooth?"smooth":"auto"});
  history.replaceState(null,"","#"+which);
  const first=authSections[which].querySelector("input");
  if(first)first.focus({preventScroll:true});
}
document.querySelectorAll('a[href="#login"],a[href="#register"]').forEach(function(a){
  a.addEventListener("click",function(e){
    e.preventDefault();
    closeMenu();
    showAuth(a.getAttribute("href").slice(1),true);
  });
});
if(location.hash==="#login"||location.hash==="#register")showAuth(location.hash.slice(1),false);

// ---------- Login form ----------
const loginForm=document.getElementById("loginForm"),loginStatus=document.getElementById("loginStatus"),loginEmail=document.getElementById("loginEmail"),loginPassword=document.getElementById("loginPassword");
function setInvalid(f,bad){
  f.closest(".form-group").classList.toggle("invalid",bad);
  f.setAttribute("aria-invalid",bad);
  return !bad;
}
loginEmail.addEventListener("input",function(){setInvalid(loginEmail,false);});
loginPassword.addEventListener("input",function(){setInvalid(loginPassword,false);});
loginForm.addEventListener("submit",async function(e){
  e.preventDefault();
  loginStatus.textContent="";loginStatus.style.color="";
  const a=setInvalid(loginEmail,!rules.email(loginEmail.value)),b=setInvalid(loginPassword,loginPassword.value==="");
  if(!a||!b)return;
  const btn=loginForm.querySelector("button[type='submit']");
  btn.disabled=true;
  const r=await loginUser(loginEmail.value,loginPassword.value);
  if(r.ok){loginForm.reset();showWelcome(r.name,r.role,true);}
  else{loginStatus.style.color="#c0392b";loginStatus.textContent=r.message;}
  btn.disabled=false;
});

document.getElementById("year").textContent=new Date().getFullYear();
