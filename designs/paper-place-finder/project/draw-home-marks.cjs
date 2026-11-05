const path=require('node:path');
module.exports=async({plate,D,outDir})=>{
  const time=plate({id:'time-annotation',w:80,h:108,ppm:10,paper:'cartridge',seed:'sky-time-note-1'});
  time.curve([[10,35],[22,35.6],[39,34.7],[55,35.3],[66,34]],{color:'#a08060',nib:.19,profile:'taper'});
  time.colour([D.curve([[11,36],[36,35.7],[61,35],[62,36],[39,36.8],[12,37]])],'#c19c6a',{pressure:.22,passes:1,angle:2});
  time.curve([[12,65],[9,66],[8.5,72],[9,87],[12,88]],{color:'#757469',nib:.2,profile:'taper'});
  time.curve([[17,91],[31,90.5],[46,91.4],[60,91]],{color:'#ada48e',nib:.11,profile:'taper'});
  await time.finish(path.join(outDir,'home-time-marks.png'));
  const rule=plate({id:'annotation-rule',w:100,h:10,ppm:10,paper:'cartridge',seed:'sky-heading-mark-1'});
  rule.curve([[2,5],[19,4.6],[39,5.2],[58,4.9],[79,5.3],[98,4.5]],{color:'#9b907b',nib:.15,profile:'taper'});
  rule.curve([[15,6],[28,5.7],[42,6.1]],{color:'#b3a28b',nib:.09,profile:'taper'});
  await rule.finish(path.join(outDir,'home-pencil-rule.png'));
};
