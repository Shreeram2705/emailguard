import { analyzePatterns } from './regexEngine.js';
import { runDFA } from './dfaEngine.js';
export const defaultConfig={weights:{invalidSender:25,repeatedSpam:20,suspiciousSubject:15,uppercase:10,suspiciousUrl:20,urgency:10,suspiciousKeyword:15,dfaAccepted:10},thresholds:{suspicious:20,spam:50}};
export function classifyEmail(email, config=defaultConfig) {
 const regexResults=analyzePatterns(email); const body=`${email.subject||''}\n${email.messageBody||''}`;
 const tokens=body.toLowerCase().match(/[a-z0-9]+/g)||[];
 const suspiciousSet=new Set(['password','verify','account','wire','transfer','gift','card','crypto','wallet','credentials','urgent','immediately','winner','free','claim','click']);
 const sequence=tokens.map(t=>suspiciousSet.has(t)?'S':'N'); const dfaResults=runDFA(sequence);
 const counts={spam:regexResults.find(x=>x.name==='spamKeywords').count,suspicious:regexResults.find(x=>x.name==='suspiciousKeywords').count};
 const subjectFlag=/(urgent|verify|suspended|action required|account alert)/i.test(email.subject||'');
 const upper=regexResults.find(x=>x.name==='excessiveUppercase').count>0;
 const url=regexResults.find(x=>x.name==='suspiciousUrls').count>0;
 const urgency=regexResults.find(x=>x.name==='urgencyPhrases').count>=2;
 const senderInvalid=!regexResults.find(x=>x.name==='senderEmailFormat').accepted;
 const rules=[]; const add=(id,label,triggered,weight)=>{if(triggered)rules.push({id,label,contribution:weight});};
 add('invalidSender','Sender address has invalid syntax',senderInvalid,config.weights.invalidSender);
 add('repeatedSpam','Promotional spam phrase detected',counts.spam>=2,config.weights.repeatedSpam);
 add('suspiciousSubject','Suspicious subject wording',subjectFlag,config.weights.suspiciousSubject);
 add('uppercase','Excessive uppercase text',upper,config.weights.uppercase);
 add('suspiciousUrl','High risk URL pattern detected',url,config.weights.suspiciousUrl);
 add('urgency','Urgency language detected',urgency,config.weights.urgency);
 add('suspiciousKeyword','Credential or payment term detected',counts.suspicious>0,config.weights.suspiciousKeyword);
 add('dfaAccepted','Three or more consecutive suspicious tokens',dfaResults.accepted,config.weights.dfaAccepted);
 const riskScore=Math.min(100,rules.reduce((n,r)=>n+r.contribution,0));
 const classification=riskScore>=config.thresholds.spam?'SPAM':riskScore>=config.thresholds.suspicious?'SUSPICIOUS':'SAFE';
 return {classification,riskScore,rules,detectedPatterns:rules.map(r=>r.label),regexResults,dfaResults,extractedUrls:[...new Set((body.match(/https?:\/\/[^\s<>()]+/gi)||[]))]};
}
