(function(root){'use strict';
// Cookie Manager Pro licence storage (src/utils/license-manager.js, trial-manager.js, feature-gate.js):
// licenseData {valid,tier:'free'|'pro'|'lifetime',features,expiresAt,email,licenseKey,cachedAt}
// licenseKey  raw ZOVO-XXXX-XXXX-XXXX-XXXX string retained across cache downgrades
// trialData   {startedAtMs,expiresAtMs,expired,convertedToPaid,reminderSentDays} (feature-gate fallback also reads trialActive/isActive + trialEndDate/endDate)
const LICENSE='licenseData',LICENSE_KEY='licenseKey',TRIAL_DATA='trialData',WATCHED=[LICENSE,LICENSE_KEY,TRIAL_DATA];
const CAMPAIGN="zovo.membership.cookie.v1",PRODUCT="Cookie Manager Pro",CARD="Keep your cookies in view. Help me keep improving Cookie Manager Pro.",DAYS30=30*86400000;
function isObject(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function numberOrNull(v){return v===undefined||v===null||(typeof v==='number'&&Number.isFinite(v));}
function licenseKind(record,key){
 if(key!==undefined&&key!==null&&key!==''){if(typeof key!=='string')return 'unknown';}
 if(record===undefined||record===null){return key?'unknown':'free';}
 if(!isObject(record))return 'unknown';
 if(record.valid===true)return 'member';
 if(typeof record.tier==='string'&&record.tier&&record.tier!=='free')return 'member';
 if(record.isPro===true)return 'member';
 if(record.licenseKey!==undefined&&record.licenseKey!==null&&record.licenseKey!=='')return 'unknown';
 if(key)return 'unknown';
 if(record.tier!==undefined&&record.tier!=='free')return 'unknown';
 if(record.valid!==undefined&&typeof record.valid!=='boolean')return 'unknown';
 if(!numberOrNull(record.cachedAt))return 'unknown';
 if(record.expiresAt!==undefined&&record.expiresAt!==null&&typeof record.expiresAt!=='number'&&typeof record.expiresAt!=='string')return 'unknown';
 return 'free';
}
// Returns {kind, trialUntil}; trial records never outrank member/unknown.
function trialKind(trial){
 if(trial===undefined||trial===null)return {kind:'free',until:0};
 if(!isObject(trial))return {kind:'unknown',until:0};
 if(trial.convertedToPaid===true)return {kind:'member',until:0};
 let until=null;
 if(trial.expiresAtMs!==undefined&&trial.expiresAtMs!==null){if(typeof trial.expiresAtMs!=='number'||!Number.isFinite(trial.expiresAtMs))return {kind:'unknown',until:0};until=trial.expiresAtMs;}
 const end=trial.trialEndDate!==undefined?trial.trialEndDate:trial.endDate;
 if(until===null&&end!==undefined&&end!==null){const t=typeof end==='number'?end:Date.parse(String(end));if(!Number.isFinite(t))return {kind:'unknown',until:0};until=t;}
 if(until===null)return {kind:'free',until:0};
 if(trial.expired===true)return {kind:'free',until:0};
 if(until>Date.now())return {kind:'trial',until};
 return {kind:'free',until:0};
}
function subscriptionKind(data){
 if(!isObject(data))return 'unknown';
 const license=licenseKind(data[LICENSE],data[LICENSE_KEY]);if(license!=='free')return license;
 return trialKind(data[TRIAL_DATA]).kind;
}
function trialUntil(data){return isObject(data)?trialKind(data[TRIAL_DATA]).until:0;}
function classify(data,state,now){const kind=subscriptionKind(data);if(kind!=='free')return kind;
 if(state!==undefined&&state!==null){if(!isObject(state))return 'unknown';if(state.memberSeen)return 'member';if(state.recoverySeen)return 'unknown';if(state.hidden===true)return 'dismissed';if(state.dismissedAt!==undefined&&(typeof state.dismissedAt!=='number'||!Number.isFinite(state.dismissedAt)))return 'unknown';if(state.dismissedAt&&now-state.dismissedAt<DAYS30)return 'dismissed';}return 'free';}
const MEMBER=CAMPAIGN+'.memberSeen',RECOVERY=CAMPAIGN+'.recoverySeen',TRIAL=CAMPAIGN+'.trialUntil',PORT=CAMPAIGN+'.status';
function requestWorkerStatus(){return new Promise(resolve=>{let port,done=false;const finish=status=>{if(done)return;done=true;clearTimeout(timer);try{port?.disconnect();}catch{}resolve(status);};const timer=setTimeout(()=>finish('unknown'),2500);try{port=chrome.runtime.connect({name:PORT});port.onMessage.addListener(message=>{finish(message&&message.campaign===CAMPAIGN&&['free','member','trial','unknown'].includes(message.status)?message.status:'unknown');});port.onDisconnect.addListener(()=>{void chrome.runtime.lastError;finish('unknown');});port.postMessage({request:'status'});}catch{finish('unknown');}});}
async function read(){try{const data=await chrome.storage.local.get([...WATCHED,CAMPAIGN,MEMBER,RECOVERY,TRIAL]);const localKind=classify(data,data[CAMPAIGN],Date.now());if(data[MEMBER]===true)return 'member';if(data[RECOVERY]===true)return 'unknown';if(data[TRIAL]!==undefined&&(typeof data[TRIAL]!=='number'||!Number.isFinite(data[TRIAL])))return 'unknown';if(data[TRIAL]>Date.now())return 'trial';const workerKind=await requestWorkerStatus();if(workerKind!=='free')return workerKind;return localKind;}catch{return 'unknown';}}
async function dismiss(forever){const data=await chrome.storage.local.get(CAMPAIGN);await chrome.storage.local.set({[CAMPAIGN]:{...(isObject(data[CAMPAIGN])?data[CAMPAIGN]:{}),dismissedAt:Date.now(),hidden:forever===true}});}
function touches(changes){return WATCHED.some(k=>changes[k])||!!(changes[CAMPAIGN]||changes[MEMBER]||changes[RECOVERY]||changes[TRIAL]);}
root.ZovoSubscriptionMembership={LICENSE,LICENSE_KEY,TRIAL_DATA,WATCHED,CAMPAIGN,PRODUCT,CARD,classify,subscriptionKind,trialUntil,read,dismiss,touches,MEMBER,RECOVERY,TRIAL,PORT};
})(globalThis);
