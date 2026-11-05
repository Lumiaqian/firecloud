const path=require('node:path');
module.exports=async({plate,D,outDir})=>{
 const p=plate({id:'score-band',w:140,h:35,ppm:7,paper:'cartridge',seed:'score-band-1'});
 p.colour([D.curve([[3,10],[29,7],[64,9],[99,6],[136,8],[134,24],[101,26],[68,24],[28,27],[4,23]])],'#d4b477',{pressure:.58,passes:2,angle:3});
 p.colour([D.curve([[8,21],[40,19],[78,21],[131,18],[130,24],[86,26],[44,24],[7,27]])],'#c09564',{pressure:.2,passes:1,angle:4});
 await p.finish(path.join(outDir,'score-band.png'));
};
