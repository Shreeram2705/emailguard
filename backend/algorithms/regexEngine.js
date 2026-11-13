export const patterns = {
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  suspiciousKeywords: /\b(password|verify your account|wire transfer|gift card|crypto wallet|social security|bank details|credentials)\b/gi,
  spamKeywords: /\b(free|winner|claim now|limited offer|act now|guaranteed|click here)\b/gi,
  suspiciousUrls: /\b(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[\w./?=%&-]*)?|https?:\/\/[^\s/]+\.(?:tk|top|xyz|click|work|zip)(?:\/[^\s]*)?/gi,
  repeatedPunctuation: /[!?.,$]{4,}/g,
  excessiveUppercase: /\b[A-Z]{4,}(?:\s+[A-Z]{2,}){2,}\b/g,
  urgency: /\b(urgent|immediately|within 24 hours|account will be suspended|act now|final warning)\b/gi,
};
function matches(regex, text) { return [...text.matchAll(regex)].map(m => m[0]); }
export function analyzePatterns(email) {
 const body = `${email.subject || ''}\n${email.messageBody || ''}`;
 const results = [];
 const add=(name,description,found,accepted=true)=>results.push({name,description,matches:found,count:found.length,accepted:accepted && found.length===0});
 const senderOK=patterns.email.test(email.sender || '');
 add('senderEmailFormat','Sender address syntax (does not verify mailbox existence)',senderOK?[]:[email.sender||'(empty)'],senderOK);
 add('recipientEmailFormat','Optional recipient address syntax',email.recipient&&!patterns.email.test(email.recipient)?[email.recipient]:[]);
 add('suspiciousKeywords','Credential, payment, or identity related terms',matches(patterns.suspiciousKeywords,body));
 add('spamKeywords','Common promotional or spam phrases',matches(patterns.spamKeywords,body));
 add('suspiciousUrls','IP address URLs or high risk top-level domains',matches(patterns.suspiciousUrls,body));
 add('repeatedPunctuation','Four or more consecutive punctuation marks',matches(patterns.repeatedPunctuation,body));
 add('excessiveUppercase','Multiple consecutive uppercase words',matches(patterns.excessiveUppercase,body));
 add('urgencyPhrases','Urgency or threat phrases',matches(patterns.urgency,body));
 return results;
}
export function extractUrls(text='') { return [...new Set(text.match(/https?:\/\/[^\s<>()]+/gi)||[])]; }
