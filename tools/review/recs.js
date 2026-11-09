// Рекомендации врачу по каждой невычитанной статье (волны 2+): фразы для проверки, что дописать, фото, услуга.
const fs=require('fs'),path=require('path');
module.exports=function recs(ROOT){
const all=Object.assign({},...fs.readdirSync(path.join(ROOT,'data/blog')).map(f=>require(ROOT+'/data/blog/'+f)));
const P=require(ROOT+'/data/blog-plan.js');const PLAN=P.PLAN||P;delete require.cache[require.resolve(ROOT+'/data/blog-reviewed.js')];const REV=require(ROOT+'/data/blog-reviewed.js');
const {PROCEDURES}=require(ROOT+'/data/procedures');const proc=s=>PROCEDURES.find(p=>p.slug===s);
const minP=o=>Math.min(...o.prices.map(x=>x.p));const rub=n=>n.toLocaleString('ru-RU').replace(/\s/g,' ')+' ₽';
const RISK_MED=/препарат|таблетк|антибиотик|обезболива|капл|мазь|слабительн|доз|инсулин|гормон|вазелин|перекис|зелёнк|спирт|вакцин|противояди/i;
const RISK_FA=/прижмите|наложите|приложите|не давайте|не пытайтесь|вызвать рвоту|охлад|согрей|жгут|переносите|положите|не тяните|не вправляйте|промойте/i;
const RISK_NUM=/\d+[–-]?\d*\s?(час|дн|сут|недел|минут|месяц|мес|лет|год|%|мм|см|кг|°|мл|раз)/i;
const PHOTO={urgent:'фото или схема первой помощи (как наложить повязку, как переносить питомца)',neuter:'фото аккуратного шва на 1-й и 10-й день, питомец в попоне или воротнике',care:'фото нормального шва и того, что должно насторожить (с согласия владельцев)',onco:'фото образования до и после удаления, гистологическое заключение без персональных данных',ortho:'рентген до и после операции, фото питомца на прогулке после восстановления',uro:'УЗИ или рентген с камнями, удалённые камни',repro:'фото УЗИ, малыши после кесарева (с согласия владельцев)',skin:'фото раны в динамике: до обработки, через неделю, после заживления'};
const sentences=a=>{const out=[];const push=(t,where)=>String(t).split(/(?<=[.!?])\s+/).forEach(s=>s.trim()&&out.push({s:s.trim(),where}));
 let sec='Вступление';push(a.lead,'Вступление');
 for(const b of a.blocks){if(b[0]==='h2')sec=b[1];else if(b[0]==='p')push(b[1],sec);else if(b[0]==='ul'||b[0]==='ol')b[1].forEach(x=>push(x,sec));else if(b[0]==='note')push(b[2],sec+' → «'+b[1]+'»');else if(b[0]==='alarm')b[2].forEach(x=>push(x,sec+' → «'+b[1]+'»'));else if(b[0]==='table')b[3].forEach(r=>push(r.join(' — '),sec+' → таблица'))}
 a.faq.forEach(q=>push(q[1],'Вопрос «'+q[0]+'»'));return out};
const rows=[];
for(const p of PLAN){const a=all[p.slug];if(!a||(p.wave||1)===1||REV[p.slug])continue;
 const S=sentences(a);
 const pick=(re,n)=>S.filter(x=>re.test(x.s));
 const med=pick(RISK_MED),fa=pick(RISK_FA),num=pick(RISK_NUM).filter(x=>!RISK_MED.test(x.s));
 const seen=new Set();const checks=[];
 const addc=(arr,why,n)=>{for(const x of arr){if(checks.length>=6||n<=0)break;const k=x.s.slice(0,50);if(seen.has(k))continue;seen.add(k);checks.push({q:x.s,where:x.where,why});n--}};
 addc(fa,'первая помощь: безопасно ли так делать дома',3);addc(med,'лекарства: верно ли и не опасно ли без назначения',3);addc(num,'цифры и сроки: совпадают ли с вашей практикой',3);
 const h2=a.blocks.filter(b=>b[0]==='h2').map(b=>b[1]);
 const add=[];
 const treat=h2.find(h=>/лечат|операци|удаляют|исправляют|Лечение|Техника/i.test(h));
 if(treat)add.push(`В разделе «${treat}»: какой способ вы выбираете чаще и почему, сколько обычно длится операция и восстановление у ваших пациентов.`);
 const signs=h2.find(h=>/признак|когда к врачу|тревож|срочно|распознать|заметить/i.test(h));
 if(signs)add.push(`В разделе «${signs}»: что владельцы чаще всего пропускают или замечают слишком поздно — один пример из практики.`);
 const home=h2.find(h=>/дома|уход|восстановлен|после операции|кормлен|режим/i.test(h));
 if(home)add.push(`В разделе «${home}»: ваше главное правило для владельцев — то, что вы повторяете на каждой выписке.`);
 if(add.length<2)add.push(`Добавьте 1–2 фразы от первого лица: как часто вы видите «${p.title.split(/[:?]/)[0].toLowerCase()}» и с чем к вам обычно приходят.`);
 if(add.length<3)add.push('Если есть типичная ошибка владельцев по этой теме — опишите её одной фразой, это сделает статью узнаваемо вашей.');
 const shortFaq=a.faq.filter(q=>q[1].length<45).map(q=>q[0]);
 if(shortFaq.length)add.push(`Развернуть короткие ответы в FAQ: ${shortFaq.map(q=>'«'+q+'»').join(', ')} — сейчас ответ в одну строку, нужно 2–3 предложения с объяснением.`);
 const ops=p.ops.map(proc).filter(Boolean).slice(0,2);
 const price=ops.map(o=>`${o.title} — от ${rub(minP(o))}`).join('; ');
 const flags=[];if(fa.length||p.rubric==='urgent')flags.push('первая помощь');if(med.length)flags.push('лекарства');if(num.length)flags.push('сроки и цифры');
 const risk=(flags.includes('первая помощь')?2:0)+(flags.includes('лекарства')?2:0)+flags.length;
 rows.push({s:p.slug,t:p.title,r:p.rubric,w:p.wave,k:risk>=5?3:risk>=3?2:1,f:flags,c:checks,a:add,ph:PHOTO[p.rubric],pr:price,l:a.lead});
}
rows.sort((x,y)=>y.k-x.k||x.r.localeCompare(y.r));
return rows;
};
