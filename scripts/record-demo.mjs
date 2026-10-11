/**
 * Record the connected workflow using real Live Gemini by default.
 * Start production first: npm run build && npm run start -- --port 3003
 * DEMO_URL and PLAYWRIGHT_CHROME_PATH may override local defaults.
 * --sample records only explicitly labeled fixtures; --screenshots-only skips video.
 * Recording captions are overlays; application responses are never mocked.
 */
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = await import('@playwright/test');
const baseURL = process.env.DEMO_URL || 'http://127.0.0.1:3003';
const sampleOnly = process.argv.includes('--sample');
const screenshotsOnly = process.argv.includes('--screenshots-only');
const output = path.resolve('docs');
const screenshots = path.join(output, 'screenshots');
const temporaryVideo = await mkdtemp(path.join(tmpdir(), 'omni-connected-demo-'));
await mkdir(screenshots, {recursive:true});
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || (existsSync(macChrome) ? macChrome : undefined);
const browser = await chromium.launch({headless:true,...(chromePath ? {executablePath:chromePath} : {})});
const context = await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce',...(screenshotsOnly?{}:{recordVideo:{dir:temporaryVideo,size:{width:1440,height:960}}})});
const page=await context.newPage();
page.setDefaultTimeout(48_000);
const responses=[];
page.on('response',async(response)=>{
  if (!/\/api\/(bridge|visits|documents)$/.test(response.url())) return;
  try { responses.push({route:new URL(response.url()).pathname,status:response.status(),request:response.request().postDataJSON(),result:await response.json()}); } catch {}
});
async function caption(title,body){
  await page.evaluate(({title,body,sampleOnly})=>{
    let box=document.getElementById('recording-caption');
    if(!box){box=document.createElement('aside');box.id='recording-caption';box.setAttribute('aria-hidden','true');Object.assign(box.style,{position:'fixed',left:'24px',right:'24px',bottom:'16px',zIndex:'10000',pointerEvents:'none',background:'rgba(20,55,46,.98)',color:'#f8fbf5',borderRadius:'7px',padding:'16px 22px',fontFamily:'Arial,sans-serif',display:'grid',gridTemplateColumns:'210px 1fr',gap:'24px'});document.body.append(box);}
    box.replaceChildren();
    const label=document.createElement('div');label.textContent=sampleOnly?'SAYAHH\nLABELED SAMPLE WALKTHROUGH':'SAYAHH\nLIVE + LABELED SAMPLE DEMO';Object.assign(label.style,{whiteSpace:'pre-line',fontSize:'10px',letterSpacing:'1px',lineHeight:'1.7',color:'#c4d8ca'});
    const content=document.createElement('div');const heading=document.createElement('strong');heading.textContent=title;Object.assign(heading.style,{display:'block',fontSize:'18px',fontWeight:'500',marginBottom:'5px'});const paragraph=document.createElement('p');paragraph.textContent=body;Object.assign(paragraph.style,{fontSize:'13px',lineHeight:'1.5',margin:'0',color:'#d2e1d5'});content.append(heading,paragraph);box.append(label,content);
  },{title,body,sampleOnly});
}
async function scene(seconds,title,body,action){const started=Date.now();await caption(title,body);console.log(`Scene: ${title}`);if(action)await action();const remaining=seconds*1000-(Date.now()-started);if(remaining>0)await page.waitForTimeout(remaining);}
async function prepareDocument(target=page){await target.getByRole('button',{name:'Prepare explanation',exact:true}).click();await target.locator('.doc-translated-draft').first().waitFor();}
async function shareDocument(target=page){await target.getByRole('checkbox',{name:'I have reviewed the source, explanation, and English reverse rendering.',exact:true}).check();await target.getByRole('button',{name:'Show to participant',exact:true}).click();await target.locator('.doc-released').waitFor();await target.locator('.doc-participant').evaluate(e=>e.scrollTop=0);}
async function shareTurn(){await page.getByRole('checkbox',{name:'I have reviewed the original, translation, and reverse rendering.',exact:true}).check();await page.getByRole('button',{name:'Share this turn',exact:true}).click();}
try{
  if(!screenshotsOnly){
    await page.goto(baseURL+'/documents',{waitUntil:'networkidle'});
    await page.getByLabel('Participant preferred language').selectOption('tr-TR');
    await page.getByLabel('Explanation engine').selectOption(sampleOnly?'sample':'live');
    await scene(10,'Understand the trial. Then discuss it.','HackRU Fall 2026. One source, two voices; 16 live languages and six sample languages. This fictional education prototype keeps a human review step before sharing.');
    await scene(12,'Start with a confusing trial paragraph.','The CLEAR Study explains random assignment, a 50% chance, and placebo. The original stays visible.',async()=>{
      await page.getByRole('button',{name:/02 Group assignment/}).click();
      await page.getByRole('button',{name:'Explain term: placebo',exact:true}).first().click();
      await page.waitForTimeout(2500);await page.getByRole('button',{name:'Close glossary'}).click();
    });
    await scene(20,sampleOnly?'Prepare a labeled Turkish sample.':'Generate a real Turkish draft with Gemini.','A separate call renders only the translated text back into English. Neither rendering certifies accuracy.',()=>prepareDocument());
    await scene(14,'Compare the draft with its source.','Source evidence and numerical checks support inspection. The participant receives nothing until the coordinator reviews and shares.',async()=>{await page.locator('.doc-evidence summary').click();await page.waitForTimeout(3000);await shareDocument();});
    await scene(14,'The participant has a question.','Prepared question starters need no AI call. The editable question carries its source passage into Conversation.',async()=>{
      await page.getByRole('button',{name:'Use question: Can you explain this part?',exact:true}).click();
      await page.getByRole('button',{name:'Discuss this question',exact:true}).click();
      await page.getByLabel('Participant message').scrollIntoViewIfNeeded();
    });
    if(!sampleOnly){
      await scene(20,'Translate the participant’s words into English.','The app translates the question; it does not answer it. Both the translation and Turkish reverse rendering stay available for review.',async()=>{
        await page.getByRole('button',{name:'Translate for clinician',exact:true}).click();await page.locator('.visit-review-texts').waitFor();await page.waitForTimeout(2500);await shareTurn();
      });
      await scene(22,'A person replies. Gemini translates the reply.','This English response is written by the coordinator. It is reviewed before joining the bilingual history.',async()=>{
        await page.getByRole('group',{name:'Speaking as'}).getByRole('button',{name:/^Clinician/}).click();
        await page.getByLabel('Clinician message').fill('A computer assigns the group by chance. Neither you nor the researcher chooses the group. You have a 50% chance of either group.');
        await page.getByRole('button',{name:'Translate for participant',exact:true}).click();await page.locator('.visit-review-texts').waitFor();await page.waitForTimeout(2500);await shareTurn();await page.getByRole('region',{name:'Shared conversation'}).scrollIntoViewIfNeeded();
      });
    }else{
      await scene(42,'A clearly labeled conversation backup.','Sample mode loads prepared fixture turns. It makes no live model calls and does not translate arbitrary questions.',async()=>{await page.getByRole('button',{name:'Try a sample',exact:true}).click();await page.getByRole('button',{name:'Open prepared conversation',exact:true}).click();await page.getByRole('region',{name:'Shared conversation'}).scrollIntoViewIfNeeded();});
    }
    await scene(12,'Move between workspaces without losing the session.','The source and language stay connected across navigation. Shared turns save in this browser; drafts and document explanations do not.',async()=>{
      await page.getByRole('link',{name:'Documents',exact:true}).click();await page.locator('.doc-released').waitFor();await page.locator('.doc-participant').evaluate(e=>e.scrollTop=0);
    });
    await scene(22,'Reuse the guide for a fictional visit note.','This segment explicitly uses Sample mode. It explains the supplied note, preserves its quantities, and adds no treatment target.',async()=>{
      await page.getByLabel('Explanation engine').selectOption('sample');await page.getByLabel('Document source').selectOption('visit-summary');await prepareDocument();await page.waitForTimeout(2500);await shareDocument();
    });
    await scene(14,'Ready to discuss, with clear limits.','Typed input remains available. Microphone support depends on the browser. Shared turns save locally; optional profiles and plans use browser storage. Use fictional data only. Qualified review remains pending.',async()=>{
      await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Reading preferences',exact:true}).click();await page.getByLabel('Text size').selectOption('large');await page.getByRole('button',{name:'Done',exact:true}).click();
    });
    const video=page.video();await context.close();await rename(await video.path(),path.join(output,'demo.webm'));
    await writeFile(path.join(output,'integrated-demo-qa.json'),JSON.stringify({recordedAt:new Date().toISOString(),model:'gemini-3.5-flash-lite',liveRecording:!sampleOnly,notes:'Actual application API responses; captions only are recording overlays. Typed synthetic inputs; no microphone or qualified language review.',responses},null,2)+'\n');
    console.log('Saved docs/demo.webm and actual response record.');
  }else{await context.close();}
  const stills=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});const still=await stills.newPage();
  await still.goto(baseURL+'/documents',{waitUntil:'networkidle'});await still.getByLabel('Participant preferred language').selectOption('tr-TR');await still.getByLabel('Explanation engine').selectOption('sample');
  await still.screenshot({path:path.join(screenshots,'desktop-workspace.png')});await prepareDocument(still);await still.screenshot({path:path.join(screenshots,'document-review.png')});await shareDocument(still);await still.screenshot({path:path.join(screenshots,'desktop.png')});
  await still.getByRole('button',{name:'Use question: Can you explain this part?',exact:true}).click();await still.getByRole('button',{name:'Discuss this question',exact:true}).click();await still.screenshot({path:path.join(screenshots,'document-question-handoff.png')});
  await still.getByRole('button',{name:'Try a sample',exact:true}).click();await still.getByRole('button',{name:'Open prepared conversation',exact:true}).click();await still.getByRole('region',{name:'Shared conversation'}).scrollIntoViewIfNeeded();await still.screenshot({path:path.join(screenshots,'visits-conversation.png')});
  await still.getByRole('link',{name:'Documents',exact:true}).click();await still.getByLabel('Document source').selectOption('visit-summary');await prepareDocument(still);await shareDocument(still);await still.screenshot({path:path.join(screenshots,'visit-document.png')});
  await still.setViewportSize({width:390,height:844});await still.getByRole('tab',{name:'Source',exact:true}).click();await still.screenshot({path:path.join(screenshots,'mobile.png')});await still.getByRole('tab',{name:'Participant',exact:true}).click();await still.screenshot({path:path.join(screenshots,'mobile-participant.png')});
  if(await still.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile horizontal overflow');
  await stills.close();console.log('Updated connected desktop/mobile screenshots.');
}finally{await browser.close();await rm(temporaryVideo,{recursive:true,force:true});}
