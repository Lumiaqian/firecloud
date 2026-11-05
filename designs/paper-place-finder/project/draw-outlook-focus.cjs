const path=require('node:path');
const fs=require('node:fs');
const {createCanvas,loadImage}=require(path.join(require('node:os').homedir(),'.agents/skills/pen-pencil-art/vendor/statechart-art/tools/node_modules/@napi-rs/canvas'));
module.exports=async({plate,outDir})=>{
 const p=plate({id:'outlook-focus',w:90,h:62,ppm:10,paper:'cartridge',seed:'outlook-best-day-1'});
 p.curve([[69,12],[53,7],[33,9],[16,18],[11,32],[18,47],[37,53],[58,50],[75,40],[79,26],[74,18]],{color:'#96785b',nib:.7,profile:'taper'});
 p.curve([[16,20],[12,31],[17,43]],{color:'#b29c7b',nib:.2,profile:'taper'});
 await p.finish(path.join(outDir,'outlook-focus.png'));
 // Extract the brown pigment from its paper scan so it can sit on any paper tone.
 const file=path.join(outDir,'outlook-focus.png');
 const image=await loadImage(file),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
 ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,image.width,image.height),d=pixels.data,paperGreen=d[1];
 for(let i=0;i<d.length;i+=4){
   const opacity=Math.max(0,Math.min(1,(paperGreen-d[i+1]-4)/(paperGreen-124)));
   d[i]=150;d[i+1]=120;d[i+2]=91;d[i+3]=Math.round(opacity*255);
 }
 ctx.putImageData(pixels,0,0);
 fs.writeFileSync(file,canvas.toBuffer('image/png'));
};
