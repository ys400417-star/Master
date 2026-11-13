// Run with: node --test tests/mission.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('    function missionEvaluation('),html.indexOf('    function setWeather('));
const start=Date.UTC(2026,10,13,8),end=start+3*3600000;
const mission={id:42,startTs:start,endTs:end,createdTs:start+600000,tgt:2,rwd:30000};
function setup(logs=[],slots=[]){
 const d={logs,arch:[],slots:slots.map(()=>2),slotTs:slots,missions:[{...mission}],doneMissions:[]};
 const ctx={d,Date,confirm:()=>true,toast:()=>{},save:()=>{},render:()=>{},renderMissionList:()=>{},updateMissionUI:()=>{}};
 vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
const log=(id,accept,complete=accept+60000,points=0)=>({id,s:1,dispatchTs:accept,ts:complete,points,amt:3000});
test('only completed deliveries accepted in window; bundles count individually',()=>{
 const c=setup([log(1,start-1,start+60000),log(2,start),log(3,start),log(4,end),log(5,end+1),log(6,undefined,start+50000)], [start+1000]);
 assert.equal(c.getMissionProgress(mission),3);assert.equal(c.missionEvaluation(mission).pending,1);
 assert.equal(c.missionEvaluation(mission).rows.find(r=>r.log.id===1).reason,'시작 전 수락');
});
test('registration time ignored; edited window and acceptance immediately recalculate',()=>{
 const c=setup([log(1,start+1000)]);assert.equal(c.getMissionProgress(mission),1);
 assert.equal(c.getMissionProgress({...mission,startTs:start+2000}),0);
 c.d.logs[0].dispatchTs=start-1;assert.equal(c.getMissionProgress(mission),0);
});
test('missing/invalid acceptance, correction rows and bonuses never count',()=>{
 const c=setup([log(1,null,start+1000),log(2,NaN,start+1000),log(3,start,start-1),{...log(4,start),s:999},{...log(5,start),s:'🎁'}]);
 assert.equal(c.getMissionProgress(mission),0);
});
test('points use completed records only and handle legacy missing points',()=>{
 const c=setup([log(1,start,start+1000,12.25),log(2,start,start+1000,7.75),log(3,start)], [start]);
 assert.equal(c.getMissionProgress({...mission,type:'points'}),20);
});
test('archived deliveries stay eligible for overnight mission; duplicate id counted once',()=>{
 const c=setup([log(1,start)]);c.d.arch=[{logs:[log(1,start),log(2,end,end+60000)]}];
 assert.equal(c.getMissionProgress(mission),2);
});
test('no auto reward, explicit reward once, stale click and reload safe',()=>{
 const c=setup([log(1,start),log(2,start)]);c.checkMsn();assert.equal(c.d.doneMissions.length,0);
 c.claimMission(42);assert.equal(c.d.doneMissions.length,1);assert.equal(c.d.logs.filter(l=>l.isBonus).length,1);
 c.claimMission(42);assert.equal(c.d.logs.filter(l=>l.isBonus).length,1);
 c.d=JSON.parse(JSON.stringify(c.d));c.d.missions=[{...mission}];c.claimMission(42);assert.equal(c.d.logs.filter(l=>l.isBonus).length,1);
});
test('pending deliveries cannot trigger rewards and cancellation changes nothing',()=>{
 const c=setup([log(1,start)],[start]);c.claimMission(42);assert.equal(c.d.doneMissions.length,0);
 c.d.logs.push(log(2,start));c.confirm=()=>false;c.claimMission(42);assert.equal(c.d.doneMissions.length,0);
});
test('explicit exclusion is mission-specific, reversible and preserves delivery data',()=>{
 const c=setup([log(1,start),log(2,start)]);const original=JSON.stringify(c.d.logs);
 c.toggleMissionExclusion(42,1);assert.equal(c.getMissionProgress(c.d.missions[0]),1);
 assert.equal(c.getMissionProgress({...mission,id:43}),2);
 assert.equal(JSON.stringify(c.d.logs),original);
 c.d=JSON.parse(JSON.stringify(c.d));assert.equal(c.getMissionProgress(c.d.missions[0]),1);
 c.toggleMissionExclusion(42,1);assert.equal(c.getMissionProgress(c.d.missions[0]),2);
});
