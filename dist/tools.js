// Interview workspaces retain drafts across conversational turns.
const drafts = { code: rounds[0].code, strokes: [], slides: [], slide: 0, notes: '' };
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
rounds[1].title = 'System design';
rounds[2].title = 'Career history & project deep dive';
rounds[2].prompt = 'Walk me through a project you owned. Use your slides to explain the architecture, your decisions, and the measurable outcome.';
const originalRender = render;
render = function() {
  originalRender();
  if (state.view !== 'interview') return;
  const editor = document.querySelector('.editor');
  editor.classList.add('specialized-workspace');
  if (state.round === 0) {
    editor.innerHTML = `<div class="editor-head"><b>Code editor</b><span>JavaScript</span><button class="ghost" data-tool="run">▶ Run code</button></div><textarea id="code" aria-label="JavaScript code editor" spellcheck="false">${escapeText(drafts.code)}</textarea><pre id="code-output" aria-live="polite">Run JavaScript to see console output. Execution stops after 3 seconds.</pre>`;
    document.querySelector('#code').addEventListener('input', e => drafts.code = e.target.value);
  } else if (state.round === 1) {
    editor.innerHTML = `<div class="editor-head"><b>Design whiteboard</b><button class="ghost" data-tool="undo">Undo</button><button class="ghost" data-tool="clear">Clear</button></div><div class="board-toolbar"><label>Ink <input id="ink" type="color" value="#cbff5d"></label><button class="ghost" data-tool="label">Add label</button><button class="ghost" data-tool="export-board">Export PNG</button></div><canvas id="board" width="900" height="480" aria-label="Draw your system architecture"></canvas><p class="tool-hint">Draw with mouse or touch. Add labels for services, databases, and connections.</p>`;
    setupBoard();
  } else {
    editor.innerHTML = `<div class="editor-head"><b>Project presentation</b><span>PDF · PPTX · images</span></div><label class="upload-deck">Upload your deck <input id="deck" type="file" accept=".pdf,.pptx,image/*" multiple></label><div id="slide-view"></div><div class="slide-controls"><button class="ghost" data-tool="previous">← Previous</button><span id="slide-count"></span><button class="ghost" data-tool="next">Next →</button></div><textarea id="project-notes" aria-label="Speaker notes" placeholder="Speaker notes: context, your contribution, decisions, outcomes…">${escapeText(drafts.notes)}</textarea><p id="deck-status" class="tool-hint" role="status">Files stay in this browser. PPTX shows extracted slide text; export to PDF for original formatting.</p>`;
    document.querySelector('#deck').addEventListener('change', loadDeck);
    document.querySelector('#project-notes').addEventListener('input', e => drafts.notes = e.target.value);
    showSlide();
  }
};
function runCode() {
  const output = document.querySelector('#code-output');
  output.textContent = 'Running…';
  const source = `const send=(value)=>postMessage({text:value}); console.log=(...args)=>send(args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')); console.error=console.log; try {\n${drafts.code}\n;postMessage({done:true});} catch(e){send(e.name+': '+e.message);postMessage({done:true});}`;
  const url = URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
  const worker = new Worker(url);
  let lines = [], finished = false;
  const stop = () => { worker.terminate(); URL.revokeObjectURL(url); };
  const timeout = setTimeout(() => { if(!finished){output.textContent += '\nExecution timed out (3 seconds).';stop();}},3000);
  worker.onmessage = e => { if(e.data.done){finished=true;clearTimeout(timeout);if(!lines.length)output.textContent='Completed successfully. Add console.log() to inspect values.';stop();}else{lines.push(e.data.text);output.textContent=lines.join('\n');} };
  worker.onerror = e => {output.textContent=e.message;finished=true;clearTimeout(timeout);stop();};
}
function paintBoard() {
  const canvas = document.querySelector('#board'); if(!canvas)return;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1018';ctx.fillRect(0,0,900,480);
  ctx.fillStyle='#253144';for(let x=20;x<900;x+=24)for(let y=20;y<480;y+=24)ctx.fillRect(x,y,1,1);
  for(const s of drafts.strokes){ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=3;ctx.lineCap='round';if(s.text){ctx.font='20px sans-serif';ctx.fillText(s.text,s.x,s.y);}else{ctx.beginPath();s.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}}
}
function setupBoard(){
  const canvas=document.querySelector('#board');let current;
  const point=e=>{const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*900/r.width,(e.clientY-r.top)*480/r.height];};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);current={color:document.querySelector('#ink').value,points:[point(e)]};drafts.strokes.push(current);};
  canvas.onpointermove=e=>{if(current){current.points.push(point(e));paintBoard();}};
  canvas.onpointerup=canvas.onpointercancel=()=>current=null;
  paintBoard();
}
function showSlide(){
  const item=drafts.slides[drafts.slide];const view=document.querySelector('#slide-view');
  view.innerHTML=!item?'<div class="empty-deck">▤<h3>Your project, on screen.</h3><p>Upload a PDF, PowerPoint deck, or slide images to present your work.</p></div>':item.type==='pdf'?`<object data="${item.url}" type="application/pdf"><a href="${item.url}" target="_blank">Open PDF presentation</a></object>`:item.type==='image'?`<img src="${item.url}" alt="Presentation slide ${drafts.slide+1}">`:`<article class="text-slide"><small>POWERPOINT · TEXT VIEW</small>${item.lines.map(x=>`<p>${escapeText(x)}</p>`).join('')}</article>`;
  document.querySelector('#slide-count').textContent=item?.type==='pdf'?'Use PDF page controls':`${drafts.slides.length?drafts.slide+1:0} / ${drafts.slides.length}`;
}
async function loadDeck(e){
  const status=document.querySelector('#deck-status');status.textContent='Loading presentation…';
  try{
    const files=Array.from(e.target.files);if(files.some(f=>f.size>30*1024*1024))throw new Error('Choose files smaller than 30 MB.');
    const slides=[];
    for(const file of files){
      if(file.name.toLowerCase().endsWith('.pptx')){
        if(!window.JSZip){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('PowerPoint reader unavailable. Export your deck to PDF.'));document.head.append(script);});}
        const zip=await JSZip.loadAsync(file);const entries=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
        if(!entries.length)throw new Error('No slides found in this PowerPoint file.');
        for(const name of entries){const xml=new DOMParser().parseFromString(await zip.file(name).async('text'),'application/xml');slides.push({type:'text',lines:Array.from(xml.getElementsByTagNameNS('*','t')).map(x=>x.textContent)});}
      }else if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))slides.push({type:'pdf',url:URL.createObjectURL(file)});
      else if(file.type.startsWith('image/'))slides.push({type:'image',url:URL.createObjectURL(file)});
      else throw new Error('Use PDF, PPTX, or image files.');
    }
    drafts.slides.forEach(s=>s.url&&URL.revokeObjectURL(s.url));drafts.slides=slides;drafts.slide=0;showSlide();status.textContent='Presentation ready. PPTX uses text view; PDF preserves your slide layout.';
  }catch(error){status.textContent=error.message;}
}
app.addEventListener('input',e=>{if(e.target.id==='answer')state.answers[state.round]=e.target.value;});
app.addEventListener('click',e=>{
  const tool=e.target.closest('[data-tool]')?.dataset.tool;if(!tool)return;
  if(tool==='run')runCode();
  if(tool==='undo'){drafts.strokes.pop();paintBoard();}
  if(tool==='clear'){drafts.strokes=[];paintBoard();}
  if(tool==='label'){const text=prompt('Label for your architecture diagram');if(text){drafts.strokes.push({text,x:40,y:50+drafts.strokes.filter(s=>s.text).length*30,color:document.querySelector('#ink').value});paintBoard();}}
  if(tool==='export-board'){const a=document.createElement('a');a.download='interview-whiteboard.png';a.href=document.querySelector('#board').toDataURL();a.click();}
  if(tool==='previous'||tool==='next'){drafts.slide=Math.max(0,Math.min(drafts.slides.length-1,drafts.slide+(tool==='next'?1:-1)));showSlide();}
});
