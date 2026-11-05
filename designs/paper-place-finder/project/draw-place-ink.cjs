const path=require('node:path');
module.exports=async({plate,D,outDir})=>{
 const ink='#756956';
 async function asset(name,w,h,draw){
  const P=plate({id:name,w,h,ppm:2,paper:'cream',seed:'place-ink-'+name+'-1'});draw(P);
  // Neutralize the paper base for multiply compositing onto the existing UI paper.
  const c=P.S.toCanvas(),g=c.getContext('2d'),image=g.getImageData(0,0,c.width,c.height);
  for(let i=0;i<image.data.length;i+=4)for(let k=0;k<3;k++)image.data[i+k]=Math.min(255,image.data[i+k]*255/[240,231,208][k]);
  g.putImageData(image,0,0);
  require('node:fs').writeFileSync(path.join(outDir,name+'.png'),await c.encode('png'));
 }
 await asset('place-frame',660,740,P=>{
  P.curve([[5,25],[6,6],[160,4],[375,6],[642,5],[654,12],[655,180],[653,400],[655,720],[646,733],[410,735],[180,733],[10,735],[5,720],[6,420],[4,180],[5,38]],{nib:.7,color:ink,profile:'taper'});
  P.curve([[15,100],[14,20],[130,16]],{nib:.25,color:'#b7a789',profile:'taper'});
  P.curve([[645,620],[644,723],[540,725]],{nib:.3,color:'#b7a789',profile:'taper'});
 });
 await asset('place-search-box',580,56,P=>{P.curve([[4,22],[5,5],[170,4],[380,5],[574,4],[576,24],[574,50],[380,51],[150,50],[6,51],[4,29]],{nib:.8,color:ink,profile:'taper'});});
 await asset('place-current',580,82,P=>{P.colour([D.curve([[27,12],[180,9],[370,12],[550,8],[555,65],[360,71],[170,68],[25,72]])],'#d9bd72',{pressure:.22,passes:1,angle:8});});
 await asset('place-rule',580,8,P=>{P.curve([[3,4],[100,3.5],[230,4.5],[400,3],[575,4]],{nib:.35,color:'#a3957a',profile:'taper'});});
 for(const name of ['search','locate','star','close','arrow'])await asset('place-'+name,24,24,P=>{
  const o={nib:.65,color:name==='locate'?'#b53826':ink,profile:'taper'};
  if(name==='search'){P.outline([D.ell(9.5,9.5,6.3,6.6)],o);P.ink([[14,14],[20.5,21]],o);}
  if(name==='locate'){P.outline([D.ell(12,12,6.8,7.2)],o);P.outline([D.ell(12,12,1.7,1.9)],o);for(const pts of [[[12,1],[12,6]],[[12,18],[12,23]],[[1,12],[6,12]],[[18,12],[23,12]]])P.ink(pts,o);}
  if(name==='star'){const pts=[[12,3],[15,8.8],[21,10],[16.5,14.3],[17.4,21],[12,18],[6.4,21],[7.5,14],[3,10],[9,9]];P.colour([pts],'#cba75a',{pressure:.45,passes:1});P.outline([pts],o);}
  if(name==='close'){P.ink([[6,5],[18,18]],o);P.ink([[18,6],[6,19]],o);}
  if(name==='arrow'){P.ink([[4,12],[20,11.5]],o);P.ink([[14,6],[20,11.5],[15,18]],o);}
 });
};
