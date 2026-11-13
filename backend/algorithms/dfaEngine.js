export const states=['q0','q1','q2','q3'];
export const transitionTable={q0:{S:'q1',N:'q0'},q1:{S:'q2',N:'q0'},q2:{S:'q3',N:'q0'},q3:{S:'q3',N:'q0'}};
export function runDFA(sequence=[]) {
 let state='q0'; const history=[];
 for (const raw of sequence) { const input=String(raw).toUpperCase(); if (!['S','N'].includes(input)) throw new Error(`Invalid DFA token: ${raw}`); const next=transitionTable[state][input]; history.push({from:state,input,to:next}); state=next; }
 return {initialState:'q0',sequence:sequence.map(x=>String(x).toUpperCase()),history,finalState:state,accepted:state==='q3',transitionTable};
}
