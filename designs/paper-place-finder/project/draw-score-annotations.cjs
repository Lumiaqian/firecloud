// Original dry-media marks for the editable forecast note. Fixed composition seed.
// Render with the pen-pencil-art skill's render.cjs; no type or weather imagery is rasterized.
const path = require('node:path');
module.exports = async ({plate,D,outDir}) => {
  const p=plate({id:'score-annotations',w:140,h:116,ppm:10,paper:'cartridge',seed:'forecast-annotations-20261104'});
  // Local colored-pencil strokes: separate directional passes, not a filled badge.
  p.colour([D.curve([[17,61],[35,59.3],[55,59.9],[62,58.7],[60,61],[39,62.4],[19,63]])],'#c99b68',{pressure:.35,passes:2,angle:6});
  p.colour([D.curve([[21,62],[41,61.5],[59,60.8],[56,62.1],[36,63.1],[22,63.7]])],'#b88855',{pressure:.27,passes:1,angle:4});
  // A single open, lightly corrected pencil circle around the score, not a container.
  p.curve([[54,25],[40,22],[26,25],[15,34],[12,45],[17,59],[29,67],[44,68],[60,64],[69,55],[71,42],[66,32],[60,28]],{color:'#9f7057',nib:.27,profile:'taper'});
  p.curve([[20,29],[14,37],[13.4,47],[17.4,57]],{color:'#b69b7b',nib:.12,profile:'taper'});
  p.curve([[32,68.9],[44,69.3],[56,66.5]],{color:'#b49e83',nib:.12,profile:'taper'});
  // Verdict leader: a fine ink gesture pointing into the open circle.
  p.curve([[101,44],[96,49],[87,49.5],[80,46],[73,40]],{color:'#5f6257',nib:.22,profile:'taper'});
  p.curve([[73,40],[73.4,43.1]],{color:'#5f6257',nib:.2,profile:'taper'});
  p.curve([[73,40],[76.1,40.3]],{color:'#5f6257',nib:.18,profile:'taper'});
  // Short ink underline beneath the verdict, offset from the pale pencil pass.
  p.colour([D.curve([[87,39.2],[111,37.7],[111.7,38.6],[88,40.4]])],'#c99b68',{pressure:.27,passes:1,angle:0});
  p.curve([[86,40],[94,39.5],[102,39.8],[111,38.6]],{color:'#9f7057',nib:.17,profile:'taper'});
  // A bracket binds the two-line observation without enclosing the card.
  p.curve([[17,81],[14.5,82],[14.1,89],[15.5,95],[18,95.5]],{color:'#727264',nib:.22,profile:'taper'});
  p.colour([D.curve([[32,93],[52,92.6],[53.2,94.3],[33,95]])],'#c99b68',{pressure:.24,passes:1,angle:3});
  p.curve([[33,95.3],[40,95],[47,95.4],[53,94.8]],{color:'#a48a66',nib:.13,profile:'taper'});
  // A small, unframed separator beside the event header.
  p.curve([[16,16],[32,15.7],[43,16.2]],{color:'#a19b87',nib:.12,profile:'taper'});
  await p.finish(path.join(outDir,'score-annotations.png'));
};
