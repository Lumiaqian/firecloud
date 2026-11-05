// Original FireCloud compositions; rendered with kevintngo/statechart-art (MIT).
// Usage: node draw-logo-studies.cjs /path/to/statechart-art
const path = require('node:path');
const root = process.argv[2];
if (!root) throw new Error('Pass the statechart-art checkout directory.');
const { plate } = require(path.join(root, 'tools/lib/classic.js'));
const D = require(path.join(root, 'tools/lib/draw.js'));
const ink = '#44372f';
function sun(P, x, y, r) {
  const ring = D.curve([[x-r,y],[x-r*.75,y-r*.72],[x-1,y-r],[x+r*.75,y-r*.7],[x+r,y+1],[x+r*.7,y+r*.72],[x,y+r],[x-r*.73,y+r*.68]]);
  P.colour([ring], '#dcaa55', {pressure:.7,passes:2,angle:28});
  P.colour([D.curve([[x-r,y+1],[x-r*.55,y+3],[x+2,y-1],[x+r,y+2],[x+r*.7,y+r*.72],[x,y+r],[x-r*.73,y+r*.68]])], '#c76d56', {pressure:.55,passes:1,angle:-25});
  P.outline([ring], {nib:.85,color:ink});
  for (const [a,b] of [[[x-22,y-8],[x-19,y-7]],[[x-15,y-19],[x-13,y-16]],[[x+1,y-23],[x+1.5,y-19]],[[x+18,y-17],[x+16,y-14]],[[x+23,y-5],[x+20,y-4]]]) P.ink([a,b],{nib:.55,color:ink,profile:'taper'});
}
async function sky() {
  const P=plate({id:'sky-logo',w:80,h:80,ppm:12.8,paper:'cream',seed:'firecloud-sky-pen-3'});
  sun(P,40,33,14);
  const cloud=D.curve([[12,48],[17,43],[23,43],[28,37],[36,38],[40,44],[47,42],[53,43],[57,47],[65,48],[68,53],[63,57],[53,57],[46,59],[36,57],[25,58],[20,55],[14,55]]);
  P.paper([cloud]); P.colour([cloud],'#b9cbd0',{pressure:.32,passes:1,angle:12});
  P.outline([cloud],{nib:.85,color:ink});
  P.curve([[23,45],[28,43],[32,44]],{nib:.45,color:ink,profile:'taper'});
  P.curve([[48,49],[53,48],[57,50]],{nib:.4,color:ink,profile:'taper'});
  P.curve([[23,65],[37,64],[52,65]],{nib:.5,color:ink,profile:'taper'});
  await P.finish(path.join(__dirname,'logo-sky-study.png'),{sizes:[['-42.png',42],['-24.png',24],['-192.png',192]]});
}
async function book() {
  const P=plate({id:'journal-logo',w:80,h:80,ppm:12.8,paper:'cream',seed:'firecloud-journal-pen-3'});
  sun(P,40,30,12);
  const base=D.curve([[13,39],[25,37],[39,43],[52,37],[66,39],[65,61],[53,59],[40,65],[27,60],[14,62]]);
  P.paper([base]);P.colour([base],'#ddc69d',{pressure:.36,passes:1,angle:32});P.outline([base],{nib:.85,color:ink});
  const left=D.curve([[16,35],[27,35],[39,41],[39,60],[28,55],[16,57]]);
  const right=D.curve([[40,41],[52,34],[64,35],[63,56],[52,54],[40,60]]);
  for(const p of [left,right]){P.paper([p]);P.outline([p],{nib:.7,color:ink});}
  P.curve([[40,42],[40.5,52],[40,61]],{nib:.9,color:ink,profile:'taper'});
  P.curve([[20,43],[27,43],[33,46]],{nib:.4,color:'#877966',profile:'taper'});
  P.curve([[47,46],[53,43],[59,43]],{nib:.4,color:'#877966',profile:'taper'});
  P.ink([[43,62],[46,69],[49,66]],{nib:.6,color:'#b53826',profile:'taper'});
  await P.finish(path.join(__dirname,'logo-journal-study.png'),{sizes:[['-42.png',42],['-24.png',24],['-192.png',192]]});
}
(async()=>{await sky();await book();console.log('Rendered both original pen/pencil studies and 24/42/192px previews.');})();
