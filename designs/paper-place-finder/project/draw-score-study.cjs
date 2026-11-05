const path=require('node:path');
module.exports=async({plate,D,outDir})=>{
 const p=plate({id:'score-sky-study',w:100,h:70,ppm:9,paper:'cartridge',seed:'sky-letter-score-observation-1'});
 p.colour([D.curve([[5,15],[32,10],[62,14],[94,8],[95,40],[70,45],[34,40],[6,44]])],'#a4b9c0',{pressure:.24,passes:1,angle:8});
 p.colour([D.curve([[6,38],[35,35],[60,38],[95,32],[94,52],[66,56],[32,53],[7,57]])],'#d7b782',{pressure:.28,passes:1,angle:2});
 p.colour([D.ell(66,42,8,8)],'#c89153',{pressure:.4,passes:2,angle:20});
 p.paper([D.curve([[10,24],[27,20],[41,23],[57,19],[73,22],[90,17],[88,24],[69,29],[47,26],[30,30],[12,29]])]);
 p.curve([[8,49],[24,48],[39,50],[56,47],[77,49],[94,46]],{color:'#77796d',nib:.16,profile:'taper'});
 p.curve([[14,58],[35,59],[57,58],[83,59]],{color:'#a7a08b',nib:.12});
 await p.finish(path.join(outDir,'score-sky-study.png'));
};
