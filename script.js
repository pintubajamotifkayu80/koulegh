const SPREADSHEET_ID = "1nbTg4Qv56eY4vImguHb5ViN-rkQglTP-krhPsEpYJu0";
const GIDS = { keywords: "0", config: "907420395", deskripsi: "1441309213" };
let df_kws=[], df_cfg={}, df_desc=[];

async function fetchCsv(gid){
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();
  return text.split("\n").map(r=>r.split(",").map(c=>c.trim()));
}

function arrayToObjects(arr){
  const [h,...rows]=arr;
  return rows.map(r=>{
    const o = {};
    h.forEach((key,i)=>o[key]=r[i]); return o;
  });
}

async function init(){
  df_kws = arrayToObjects(await fetchCsv(GIDS.keywords));
  df_cfg = arrayToObjects(await fetchCsv(GIDS.config))[0];
  df_desc = arrayToObjects(await fetchCsv(GIDS.deskripsi));

  initProduk();
}

function initProduk(){
  const media="MPFB";
  const selP = document.getElementById("inputProduk");
  const prods=[...new Set(df_kws.filter(r=>r.media==media).map(r=>r.produk))].sort();
  selP.innerHTML = prods.map(p=>`<option>${p}</option>`).join("");
  selP.onchange=renderSeries;
  renderSeries();
  renderJumlah();
}

function renderSeries(){
  const media="MPFB", prod=document.getElementById("inputProduk").value;
  const selS=document.getElementById("inputSeries");
  const sr=[...new Set(df_kws.filter(r=>r.media==media && r.produk==prod).map(r=>r.series||""))];
  selS.innerHTML = sr.map(s=>`<option>${s}</option>`).join("");
  renderJumlah();
}

function renderJumlah(){
  const cfgMax = parseInt(df_cfg.max_keywords);
  const selJ=document.getElementById("inputJumlah");
  selJ.innerHTML = Array.from({length:cfgMax},(_,i)=>i+1)
    .map(i=>`<option>${i}</option>`).join("");
  selJ.onchange=renderPrioritas;
  renderPrioritas();
}

function renderPrioritas(){
  const cont=document.getElementById("prioritasContainer");
  const media="MPFB", prod=document.getElementById("inputProduk").value;
  const series=document.getElementById("inputSeries").value;
  const jumlah=parseInt(document.getElementById("inputJumlah").value);
  cont.innerHTML="";

  for(let p=1;p<=jumlah;p++){
    const arr = df_kws.filter(r=>r.media==media&&r.produk==prod&&r.series==series&&parseInt(r.prioritas)==p);
    const cats=[...new Set(arr.map(r=>r.kategori).filter(c=>c))];
    let html = `<div class="mb-3"><h5>Prioritas ${p}</h5>`;
    if(p!==3){
      html += `<select id="prio${p}" class="form-select">${cats.map(c=>`<option>${c}</option>`).join("")}</select>`;
    }else{
      html += `<div><label><input type="radio"name="opt3" value="acak"checked> Acak</label> 
               <label><input type="radio"name="opt3" value="manual"> Manual</label></div>`;
      html += `<select id="prio3" class="form-select mt-2">${cats.map(c=>`<option>${c}</option>`).join("")}</select>`;
    }
    html += "</div>";
    cont.innerHTML+=html;
  }
}

function sample(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generate(){
  const media="MPFB", prod=document.getElementById("inputProduk").value;
  const series=document.getElementById("inputSeries").value;
  const jumlah=parseInt(document.getElementById("inputJumlah").value);
  const count=parseInt(document.getElementById("inputGenerateCount").value);
  const cfgMaxChar=parseInt(df_cfg.max_char_title);
  const allowFeat = (df_cfg.allow_feature||"").toUpperCase()=="TRUE";

  const prios = [];
  for(let p=1;p<=jumlah;p++){
    if(p===3){
      const opt3=[...document.getElementsByName("opt3")].find(r=>r.checked).value;
      if(opt3==="manual") prios.push(document.getElementById(`prio3`).value);
      else prios.push("acak");
    }else prios.push(document.getElementById(`prio${p}`).value);
  }

  const hasil=[];
  for(let n=0;n<count;n++){
    let selectedMain=[];
    prios.forEach((kat,pIndex)=>{
      const arr = df_kws.filter(r=>r.media==media&&r.produk==prod&&r.series==series&&r.prioritas==String(pIndex+1));
      const fil = kat!="acak"?arr.filter(r=>r.kategori==kat):arr;
      if(fil.length) selectedMain.push(sample(fil));
    });
    while(selectedMain.length<jumlah){
      const arr=df_kws.filter(r=>r.media==media&&r.produk==prod&&r.series==series&&r.is_main=="TRUE");
      selectedMain.push(sample(arr));
    }
    let title=selectedMain.map(r=>r.keyword).join(", ");
    if(allowFeat){
      const fs=df_kws.filter(r=>r.media==media&&r.produk==prod&&r.series==series&&r.is_feature=="TRUE");
      fs.forEach(f=>{
        if(title.length+f.keyword.length+1<=cfgMaxChar) title += " "+f.keyword;
      });
    }
    hasil.push(title);
  }
  renderHasil(hasil);
}

function renderHasil(titles){
  const c=document.getElementById("hasilContainer");
  c.innerHTML="";
  const media="MPFB", prod=document.getElementById("inputProduk").value;
  const series=document.getElementById("inputSeries").value;
  titles.forEach((t,i)=>{
    const kataAwal=t.split(",").slice(0,3).map(k=>k.trim().replace(/\s+/g,"").toLowerCase());
    const allk=df_kws.filter(r=>r.media==media&&r.produk==prod&&r.series==series).map(r=>r.keyword);
    let tags=[...new Set(allk.map(k=>k.trim().replace(/\s+/g,"").toLowerCase()))];
    tags=tags.filter(x=>!kataAwal.includes(x));
    tags = kataAwal.concat(sample(tags));
    const descRec=df_desc.find(r=>r.kategori==selectedCategory(tags)) || {};
    const desc = descRec.Deskripsi||"";
    const card = document.createElement("div"); card.className="card mb-4";
    card.innerHTML = `<div class="card-body">
      <h5 class="card-title">Judul ${i+1}</h5>
      <input class="form-control mb-2" value="${t}" readonly>
      <textarea class="form-control mb-2" readonly>${desc}</textarea>
      <button class="btn btn-sm btn-primary" onclick="copyElem(this.previousElementSibling)">Salin Deskripsi</button>
    </div>`;
    c.appendChild(card);
  });
}

function selectedCategory(tags){
  return tags[0]||"";
}

document.getElementById("btnGenerate").onclick=generate;

init();
