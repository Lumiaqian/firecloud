// Original procedural pigment study. Not a scan or a real-weather image.
// Fixed seed; translucent washes have local wet edges, not a global grunge overlay.
const {createCanvas} = require('/Users/lumiaqian/.agents/skills/pen-pencil-art/vendor/statechart-art/tools/node_modules/@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const W=1440,H=960;
let seed=3719;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function field(cell){
  const cols=Math.ceil(W/cell)+2,rows=Math.ceil(H/cell)+2;
  const values=Float32Array.from({length:cols*rows},()=>random());
  return (x,y)=>{x=Math.max(0,Math.min(W-1,x))/cell;y=Math.max(0,Math.min(H-1,y))/cell;
    const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
    const a=u*u*(3-2*u),b=v*v*(3-2*v),k=iy*cols+ix;
    return (values[k]*(1-a)+values[k+1]*a)*(1-b)+(values[k+cols]*(1-a)+values[k+cols+1]*a)*b;
  };
}
const broad=field(76),flow=field(19),tooth=field(2.7),fine=field(.9);
const c=createCanvas(W,H),ctx=c.getContext('2d');
const img=ctx.createImageData(W,H),data=img.data;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=(y*W+x)*4,g=(tooth(x,y)-.5)*2.7+(fine(x,y)-.5)*1.5;
  data[k]=253+g;data[k+1]=250+g;data[k+2]=243+g;data[k+3]=255;
}
function wash(draw,color,strength,softness=2){
  const m=createCanvas(W,H),mc=m.getContext('2d');
  mc.fillStyle='#fff';mc.beginPath();draw(mc);mc.closePath();mc.fill();
  const b=createCanvas(W,H),bc=b.getContext('2d');bc.filter=`blur(${softness}px)`;bc.drawImage(m,0,0);
  const mask=bc.getImageData(0,0,W,H).data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=(flow(x,y)-.5)*8+(broad(x,y)-.5)*10,dy=(flow(x+120,y+53)-.5)*7;
    const xx=Math.max(0,Math.min(W-1,Math.round(x+dx))),yy=Math.max(0,Math.min(H-1,Math.round(y+dy)));
    const v=mask[(yy*W+xx)*4+3]/255;if(v<.003)continue;
    const edge=4*v*(1-v),grain=.86+.2*tooth(x,y)+.06*fine(x,y);
    const pooling=.58+.64*broad(x,y)+.18*flow(x,y);
    const a=Math.min(.9,strength*(v*pooling+edge*.32)*grain),k=(y*W+x)*4;
    for(let ch=0;ch<3;ch++)data[k+ch]=data[k+ch]*(1-a)+color[ch]*a;
  }
}
// A sky opening: lost edges at the top and a clean unpainted left side.
wash(p=>{p.moveTo(724,178);p.bezierCurveTo(821,140,924,172,1004,138);p.bezierCurveTo(1104,160,1199,142,1286,184);p.lineTo(1308,560);p.bezierCurveTo(1134,601,943,563,721,599);p.bezierCurveTo(758,478,675,298,724,178);},[141,173,188],.30,12);
wash(p=>{p.moveTo(696,442);p.bezierCurveTo(831,406,1002,459,1131,400);p.bezierCurveTo(1210,408,1262,398,1311,425);p.lineTo(1302,633);p.bezierCurveTo(1130,647,972,626,863,650);p.bezierCurveTo(751,613,657,653,616,598);p.bezierCurveTo(639,526,673,510,696,442);},[228,183,112],.35,10);
// High cloud: open white breaks and an asymmetrical, receding silhouette.
wash(p=>{p.moveTo(765,252);p.bezierCurveTo(811,238,825,263,855,253);p.bezierCurveTo(895,225,914,252,946,242);p.bezierCurveTo(977,250,997,238,1016,257);p.bezierCurveTo(1084,240,1114,264,1170,243);p.bezierCurveTo(1218,249,1258,230,1291,254);p.lineTo(1280,290);p.bezierCurveTo(1211,278,1166,305,1108,288);p.bezierCurveTo(1036,302,989,273,943,289);p.bezierCurveTo(872,288,810,276,765,252);},[120,125,149],.38,2.2);
wash(p=>{p.moveTo(786,285);p.bezierCurveTo(880,287,916,310,963,292);p.bezierCurveTo(1039,308,1088,292,1138,307);p.bezierCurveTo(1209,293,1243,306,1297,288);p.lineTo(1277,318);p.bezierCurveTo(1184,325,1103,326,1041,318);p.bezierCurveTo(950,336,858,303,786,300);},[203,132,112],.32,4);
// Middle cloud mass, soft crown, distinct shadow and a warm lower lip.
wash(p=>{p.moveTo(661,379);p.bezierCurveTo(701,378,725,352,754,364);p.bezierCurveTo(776,332,803,362,829,352);p.bezierCurveTo(860,350,868,377,910,362);p.bezierCurveTo(952,344,965,372,991,365);p.bezierCurveTo(1026,369,1022,386,1059,380);p.bezierCurveTo(1108,361,1156,397,1204,384);p.bezierCurveTo(1242,372,1266,385,1302,376);p.lineTo(1291,430);p.bezierCurveTo(1220,438,1177,421,1122,440);p.bezierCurveTo(1045,444,1016,425,959,436);p.bezierCurveTo(876,415,833,431,769,406);p.bezierCurveTo(729,413,689,395,661,379);},[127,124,141],.43,5);
wash(p=>{p.moveTo(708,399);p.bezierCurveTo(787,415,827,408,872,430);p.bezierCurveTo(937,423,974,441,1020,431);p.bezierCurveTo(1077,447,1148,426,1195,440);p.lineTo(1184,455);p.bezierCurveTo(1101,454,1048,466,1007,449);p.bezierCurveTo(924,456,876,438,820,442);p.bezierCurveTo(777,425,736,431,708,415);},[209,131,107],.44,2);
wash(p=>{p.moveTo(880,477);p.bezierCurveTo(945,452,975,481,1020,466);p.bezierCurveTo(1081,451,1118,480,1157,470);p.bezierCurveTo(1210,460,1245,476,1309,450);p.lineTo(1304,497);p.bezierCurveTo(1223,501,1140,489,1090,506);p.bezierCurveTo(1024,500,949,490,880,477);},[128,125,146],.30,3);
// Ground plane: thin horizon and a few swept dry marks, not an enclosing frame.
wash(p=>{p.moveTo(570,651);p.bezierCurveTo(686,626,736,642,795,621);p.bezierCurveTo(853,602,899,630,953,615);p.bezierCurveTo(1012,607,1027,624,1078,616);p.bezierCurveTo(1148,597,1206,620,1300,604);p.lineTo(1293,653);p.bezierCurveTo(1103,669,980,646,832,665);p.bezierCurveTo(731,653,658,679,570,651);},[129,153,156],.29,3);
wash(p=>{p.moveTo(722,681);p.bezierCurveTo(904,665,1053,682,1256,665);p.lineTo(1255,675);p.bezierCurveTo(1060,690,863,680,722,687);},[154,153,136],.17,1.4);
ctx.putImageData(img,0,0);
function pencil(points,color,width,alpha){
  ctx.lineCap='round';ctx.strokeStyle=color;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));
    for(let j=0;j<n;j++){
      ctx.globalAlpha=alpha*(.55+random()*.45);ctx.lineWidth=width*(.65+random()*.5);
      const t=j/n,u=(j+1)/n,wiggle=(random()-.5)*.65;
      ctx.beginPath();ctx.moveTo(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+wiggle);
      ctx.lineTo(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u+wiggle);ctx.stroke();
    }
  }
}
pencil([[746,366],[759,362],[773,350],[787,350],[801,359]],'#66665b',1.1,.55);
pencil([[873,429],[902,426],[928,433],[954,433],[972,439]],'#796c60',1,.6);
pencil([[1108,288],[1131,293],[1167,288],[1183,290]],'#77736b',.9,.48);
pencil([[596,650],[638,644],[674,645],[707,636],[746,639],[778,630]],'#5f6964',1.4,.6);
pencil([[853,617],[879,623],[900,620],[925,623]],'#5f6964',1.1,.5);
pencil([[1081,621],[1118,614],[1144,616],[1191,612],[1228,615],[1271,609]],'#5f6964',1.2,.5);
// Pencil hatching confined to cloud undersides, with consistent stroke direction.
for(let i=0;i<36;i++){
  let x=748+i*5.2,y=402+(x-748)*.22+random()*4;
  pencil([[x,y],[x+8+random()*8,y+3+random()*2]],'#9d806e',.8,.23);
}
// A small warm emphasis stroke under the future editable verdict.
pencil([[93,585],[137,587],[184,584],[230,586],[270,582]],'#ad775a',2,.62);
pencil([[101,591],[151,590],[194,590],[242,587]],'#c7a27a',1.4,.45);
// An observation leader: annotation belongs to the depicted cloud, not a frame.
pencil([[1205,574],[1212,552],[1196,532],[1185,526]],'#746f60',1.5,.7);
pencil([[1185,526],[1195,529]],'#746f60',1.2,.65);
pencil([[1185,526],[1189,537]],'#746f60',1.2,.65);
ctx.globalAlpha=1;
fs.writeFileSync(path.join(__dirname,'sky-field-watercolor.png'),c.toBuffer('image/png'));
console.log('Saved original procedural study: sky-field-watercolor.png (1440 × 960), seed 3719');
