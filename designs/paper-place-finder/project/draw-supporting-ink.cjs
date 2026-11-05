const path=require('node:path');
const fs=require('node:fs');
const {createCanvas,loadImage}=require(path.join(require('node:os').homedir(),'.agents/skills/pen-pencil-art/vendor/statechart-art/tools/node_modules/@napi-rs/canvas'));
module.exports=async({plate,outDir})=>{
 async function save(p,name,ink){
  const file=path.join(outDir,name+'.png');await p.finish(file);
  const image=await loadImage(file),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,image.width,image.height),d=pixels.data,bg=[d[0],d[1],d[2]];
  for(let i=0;i<d.length;i+=4){const a=Math.max(0,Math.min(1,(bg[1]-d[i+1]-3)/(bg[1]-ink[1]-3)));d[i]=ink[0];d[i+1]=ink[1];d[i+2]=ink[2];d[i+3]=Math.round(a*255);}
  ctx.putImageData(pixels,0,0);fs.writeFileSync(file,canvas.toBuffer('image/png'));
 }
 const brace=plate({id:'note-brace',w:16,h:100,ppm:8,paper:'cartridge',seed:'supporting-brace-1'});
 brace.curve([[13,4],[8,5],[5,10],[5.5,28],[4,47],[5.5,67],[5,85],[8,93],[13,94]],{color:'#626655',nib:.85,profile:'taper'});
 brace.curve([[4,17],[3.7,30],[4.6,43]],{color:'#626655',nib:.25,profile:'taper'});
 await save(brace,'supporting-brace',[98,102,85]);
 const stroke=plate({id:'pencil-underline',w:100,h:14,ppm:8,paper:'cartridge',seed:'supporting-pencil-1'});
 for(let i=0;i<9;i++)stroke.curve([[3+i*.7,6+i*.45],[25,5.8+i*.47],[50,6.4+i*.32],[73,5.1+i*.37],[97-i*1.4,4.9+i*.3]],{color:'#a97845',nib:.2+(i%3)*.1,profile:'taper'});
 await save(stroke,'supporting-pencil',[169,120,69]);
 const arrow=plate({id:'note-leader',w:80,h:50,ppm:8,paper:'cartridge',seed:'supporting-arrow-1'});
 arrow.curve([[73,7],[69,20],[58,29],[41,31],[24,25],[9,18]],{color:'#626655',nib:.9,profile:'taper'});
 arrow.curve([[9,18],[11,25]],{color:'#626655',nib:.65,profile:'taper'});
 arrow.curve([[9,18],[17,17]],{color:'#626655',nib:.65,profile:'taper'});
 await save(arrow,'supporting-leader',[98,102,85]);
 const rule=plate({id:'ink-divider',w:100,h:9,ppm:8,paper:'cartridge',seed:'supporting-rule-1'});
 rule.curve([[3,5],[19,4.4],[43,5.1],[63,4.8],[85,5.2],[97,4.5]],{color:'#77735f',nib:.23,profile:'taper'});
 await save(rule,'supporting-rule',[119,115,95]);
};
