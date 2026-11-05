// Original FireCloud studies rendered with statechart-art (MIT).
// Usage: node draw-logo-more.cjs /path/to/statechart-art
const path=require('node:path');
const {plate}=require(path.join(process.argv[2],'tools/lib/classic.js'));
const D=require(path.join(process.argv[2],'tools/lib/draw.js'));
const ink='#514439';
function shape(P,points,color,nib=.65){const p=D.curve(points);P.paper([p]);if(color)P.colour([p],color,{pressure:.48,passes:2,angle:27});P.outline([p],{nib,color:ink});}
function disk(P,x,y,r){shape(P,[[x-r,y],[x-r*.7,y-r*.72],[x,y-r],[x+r*.72,y-r*.7],[x+r,y],[x+r*.7,y+r*.7],[x,y+r],[x-r*.7,y+r*.7]],'#cf7959',.6);}
async function mountain(){
 const P=plate({id:'ridge-logo',w:80,h:80,ppm:12.8,paper:'cream',seed:'firecloud-ridge-7'});
 disk(P,45,29,13);
 P.curve([[16,30],[25,28],[34,29]],{nib:.7,color:'#c4a16a',profile:'taper'});
 P.curve([[49,19],[58,18],[65,19]],{nib:.6,color:'#c4a16a',profile:'taper'});
 shape(P,[[12,54],[21,42],[28,33],[36,43],[43,39],[54,50],[67,55],[53,60],[28,60]],'#a6b6ae');
 shape(P,[[12,55],[24,51],[35,53],[48,45],[59,48],[68,55],[57,63],[36,65],[22,61]],'#c1b68d',.7);
 P.curve([[20,68],[36,69],[52,68]],{nib:.45,color:ink,profile:'taper'});
 await P.finish(path.join(__dirname,'logo-ridge-study.png'),{sizes:[['-42.png',42],['-24.png',24]]});
}
async function stamp(){
 const P=plate({id:'post-logo',w:80,h:80,ppm:12.8,paper:'cream',seed:'firecloud-post-5'});
 const edge=[];for(let x=18;x<=62;x+=4)edge.push([x,13+(x%8===2?1.1:0)]);for(let y=17;y<=65;y+=4)edge.push([62+(y%8===1?1.1:0),y]);for(let x=58;x>=18;x-=4)edge.push([x,65+(x%8===2?1.1:0)]);for(let y=61;y>=17;y-=4)edge.push([18-(y%8===1?1.1:0),y]);
 P.outline([edge],{nib:.65,color:ink});
 P.ink([[23,58],[23,20],[57,20],[57,58],[23,58]],{nib:.35,color:'#a99672'});
 disk(P,40,35,10);
 shape(P,[[24,47],[31,44],[41,47],[49,42],[56,45],[56,56],[24,56]],'#aebfc0',.45);
 P.curve([[27,51],[36,50],[45,52],[53,50]],{nib:.4,color:ink,profile:'taper'});
 P.curve([[53,28],[60,25],[68,27]],{nib:.55,color:ink,profile:'taper'});
 P.curve([[55,32],[62,29],[69,31]],{nib:.5,color:ink,profile:'taper'});
 await P.finish(path.join(__dirname,'logo-post-study.png'),{sizes:[['-42.png',42],['-24.png',24]]});
}
(async()=>{await mountain();await stamp();console.log('Rendered ridge and post studies with small previews.');})();
