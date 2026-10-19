import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const css=readFileSync(new URL('../components/education-ui/education-system-v1.css',import.meta.url),'utf8');
const light=css.slice(0,css.indexOf('[data-edu-theme="dark"]'));
const dark=css.slice(css.indexOf('[data-edu-theme="dark"]'),css.indexOf('color-scheme:dark;'));
const tokens=text=>Object.fromEntries([...text.matchAll(/--ds-([a-z-]+):\s*(#[a-f0-9]{3,6})\s*;/gi)].map(m=>[m[1],m[2]]));
const luminance=hex=>{let h=hex.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(values[0]+.05)/(values[1]+.05);};
let checks=0;
for(const [theme,t]of [['light',tokens(light)],['dark',{...tokens(light),...tokens(dark)}]]){
 for(const color of ['green','blue','yellow','orange','purple','red']){const ratio=contrast(t[color+'-ink'],t[color+'-soft']);assert(ratio>=4.5,`${theme} ${color} soft-text contrast ${ratio}`);checks++;}
 for(const [fg,bg]of [['ink','surface'],['muted','surface'],['on-color','blue']]){const ratio=contrast(t[fg],t[bg]);assert(ratio>=4.5,`${theme} ${fg}/${bg} contrast ${ratio}`);checks++;}
}
assert(css.includes('prefers-reduced-motion:reduce'));checks++;
assert(css.includes('--edu-orange:var(--ds-orange)!important'));checks++;
console.log(`Education System v1: ${checks} token, text-contrast and reduced-motion checks passed.`);
