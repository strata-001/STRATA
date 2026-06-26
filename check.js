
const SIZE=4;
let CELL_W=78,CELL_H=44,SKEW_X=48;
let LAYER_LAYOUT={4:{ox:210,oy:230,color:'#7dd3fc',fill:'rgba(125,211,252,.055)',name:'第4層'},3:{ox:210,oy:425,color:'#67e8f9',fill:'rgba(103,232,249,.050)',name:'第3層'},2:{ox:210,oy:620,color:'#38bdf8',fill:'rgba(56,189,248,.055)',name:'第2層'},1:{ox:210,oy:815,color:'#0ea5e9',fill:'rgba(14,165,233,.060)',name:'第1層'}};
function isMobileBoard(){return window.matchMedia&&window.matchMedia('(max-width:640px)').matches;}
function updateBoardLayout(){
  const svg=document.getElementById('board');
  if(isMobileBoard()){
    CELL_W=94; CELL_H=52; SKEW_X=42;
    LAYER_LAYOUT={4:{ox:36,oy:178,color:'#7dd3fc',fill:'rgba(125,211,252,.060)',name:'第4層'},3:{ox:36,oy:368,color:'#67e8f9',fill:'rgba(103,232,249,.055)',name:'第3層'},2:{ox:36,oy:558,color:'#38bdf8',fill:'rgba(56,189,248,.060)',name:'第2層'},1:{ox:36,oy:748,color:'#0ea5e9',fill:'rgba(14,165,233,.065)',name:'第1層'}};
    if(svg){svg.setAttribute('viewBox','0 0 620 805');svg.style.height='auto';}
  }else{
    CELL_W=78; CELL_H=44; SKEW_X=48;
    LAYER_LAYOUT={4:{ox:210,oy:230,color:'#7dd3fc',fill:'rgba(125,211,252,.055)',name:'第4層'},3:{ox:210,oy:425,color:'#67e8f9',fill:'rgba(103,232,249,.050)',name:'第3層'},2:{ox:210,oy:620,color:'#38bdf8',fill:'rgba(56,189,248,.055)',name:'第2層'},1:{ox:210,oy:815,color:'#0ea5e9',fill:'rgba(14,165,233,.060)',name:'第1層'}};
    if(svg){svg.setAttribute('viewBox','0 0 980 1040');svg.style.height='980px';}
  }
}
window.addEventListener('resize',()=>{clearTimeout(window.__strataResizeTimer);window.__strataResizeTimer=setTimeout(()=>{if(typeof draw==='function')draw();},120);});
const labels={C:'コア',S:'ソルジャー',L:'ランサー',D:'ダイア',R:'レンジャー'};
const shapes={C:'★',S:'●',L:'┃',D:'◇',R:'✚'};
const pieceValue={C:10000,S:2,L:6,D:6,R:4};
const startPieces=[
{id:'A-R',owner:'A',type:'R',x:1,y:1,z:1},{id:'A-D',owner:'A',type:'D',x:1,y:2,z:1},{id:'A-L',owner:'A',type:'L',x:1,y:3,z:1},{id:'A-C',owner:'A',type:'C',x:1,y:4,z:1},
{id:'A-S1',owner:'A',type:'S',x:2,y:1,z:1},{id:'A-S2',owner:'A',type:'S',x:2,y:2,z:1},{id:'A-S3',owner:'A',type:'S',x:2,y:3,z:1},{id:'A-S4',owner:'A',type:'S',x:2,y:4,z:1},
{id:'B-S1',owner:'B',type:'S',x:3,y:1,z:4},{id:'B-S2',owner:'B',type:'S',x:3,y:2,z:4},{id:'B-S3',owner:'B',type:'S',x:3,y:3,z:4},{id:'B-S4',owner:'B',type:'S',x:3,y:4,z:4},
{id:'B-R',owner:'B',type:'R',x:4,y:1,z:4},{id:'B-D',owner:'B',type:'D',x:4,y:2,z:4},{id:'B-L',owner:'B',type:'L',x:4,y:3,z:4},{id:'B-C',owner:'B',type:'C',x:4,y:4,z:4}
];
const AXIS_DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const DELTAS_26=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){if(dx||dy||dz)DELTAS_26.push([dx,dy,dz]);}
const DIAG_DIRS=[];for(const dx of [-1,1])for(const dy of [-1,1])for(const dz of [-1,1])DIAG_DIRS.push([dx,dy,dz]);
const RANGER_DELTAS=[];for(const a of AXIS_DIRS)for(const d of DIAG_DIRS){const axisIndex=a.findIndex(v=>v!==0);if(axisIndex<0||a[axisIndex]!==d[axisIndex])continue;const t=[a[0]+d[0],a[1]+d[1],a[2]+d[2]];if(t[0]||t[1]||t[2])RANGER_DELTAS.push(t);}const uniqueRanger=new Map();RANGER_DELTAS.forEach(d=>uniqueRanger.set(d.join(','),d));
const RANGER_DIRS=[...uniqueRanger.values()];
const AI_OWNER='B';
let pieces,turn,selectedId,winner,winReason,drawReason,moveNumber,moveHistory,gameMode,aiLevel,aiDelay,aiTimer,lastAiReason,positionCounts,lastMoveRecord,batchRunning,batchTargetCount,batchCompletedCount,gameStatsRecorded,gameRecords,aggregateStats,currentMetrics,hands,selectedDrop;
function ownerName(o){return o==='A'?'青':'赤';}function opponent(o){return o==='A'?'B':'A';}function clonePieces(list){return list.map(p=>({...p}));}function key(x,y,z){return `${x},${y},${z}`;}function coord(p){return `(${p.x},${p.y},${p.z})`;}function inside(x,y,z){return x>=1&&x<=SIZE&&y>=1&&y<=SIZE&&z>=1&&z<=SIZE;}function getPieceAt(x,y,z){return pieces.find(p=>p.x===x&&p.y===y&&p.z===z);}function getCore(o){return pieces.find(p=>p.owner===o&&p.type==='C');}
function blankTypeCounts(){return{C:0,S:0,L:0,D:0,R:0};}
function freshMetrics(){return{checks:{A:0,B:0},captures:{A:0,B:0},coreMoves:{A:0,B:0},moveCounts:{A:blankTypeCounts(),B:blankTypeCounts()},finishTypes:blankTypeCounts(),wallTypes:blankTypeCounts(),firstMove:''};}function freshStats(){return{games:0,blueWins:0,redWins:0,draws:0,mateWins:0,captureWins:0,surroundWins:0,stalemateWins:0,repetitions:0,moveLimit:0,totalMoves:0,minMoves:null,maxMoves:0,blueChecks:0,redChecks:0,blueCaptures:0,redCaptures:0,blueCoreMoves:0,redCoreMoves:0,moveCounts:{A:blankTypeCounts(),B:blankTypeCounts()},finishTypes:blankTypeCounts(),wallTypes:blankTypeCounts(),firstMoves:{}};}
function addCounts(dst,src){for(const t of Object.keys(dst)){dst[t]+=(src[t]||0);}}
function avgTypeText(obj,games){return Object.entries(obj).map(([k,v])=>`${k}:${games?(v/games).toFixed(2):'0.00'}`).join(' / ');}
function topFirstMoves(n=5){const arr=Object.entries(aggregateStats.firstMoves).sort((a,b)=>b[1]-a[1]).slice(0,n);return arr.length?arr.map(([k,v])=>`${k}: ${v}`).join('<br>'):'-';}
function attackersToCore(owner){const c=getCore(owner);if(!c)return[];return pieces.filter(p=>p.owner===opponent(owner)&&attackSquares(p).some(m=>m.x===c.x&&m.y===c.y&&m.z===c.z));}
function adjacentWinnerWalls(loser,winnerOwner){const c=getCore(loser),counts=blankTypeCounts();if(!c)return counts;for(const[dx,dy,dz]of DELTAS_26){const x=c.x+dx,y=c.y+dy,z=c.z+dz;if(!inside(x,y,z))continue;const p=getPieceAt(x,y,z);if(p&&p.owner===winnerOwner&&counts[p.type]!==undefined)counts[p.type]++;}return counts;}
function markFinish(winOwner,loseOwner,fallbackType=''){if(!winOwner||winOwner==='draw'||!loseOwner)return;const attackers=attackersToCore(loseOwner);if(attackers.length){attackers.forEach(p=>{if(currentMetrics.finishTypes[p.type]!==undefined)currentMetrics.finishTypes[p.type]++;});}else if(fallbackType&&currentMetrics.finishTypes[fallbackType]!==undefined){currentMetrics.finishTypes[fallbackType]++;}const walls=adjacentWinnerWalls(loseOwner,winOwner);addCounts(currentMetrics.wallTypes,walls);}
function initState(){pieces=clonePieces(startPieces);turn='A';selectedId=null;winner=null;winReason=null;drawReason=null;moveNumber=1;moveHistory=['対局開始'];gameMode=document.getElementById('modeSelect')?.value||'human';aiLevel=Number(document.getElementById('aiLevelSelect')?.value||3);aiDelay=Number(document.getElementById('speedSelect')?.value||350);aiTimer=null;lastAiReason='まだAIは指していません。';positionCounts=new Map();lastMoveRecord=null;batchRunning=false;batchTargetCount=0;batchCompletedCount=0;gameStatsRecorded=false;gameRecords=[];aggregateStats=freshStats();currentMetrics=freshMetrics();hands={A:[],B:[]};selectedDrop=null;}
function canCapture(attacker,target){return !!target&&target.owner!==attacker.owner;}
function addMoveIfValid(out,piece,x,y,z,jump=false){if(!inside(x,y,z))return;const target=getPieceAt(x,y,z);if(!target)out.push({x,y,z,capture:false,target:null,jump});else if(canCapture(piece,target))out.push({x,y,z,capture:true,target,jump});}
function stepMoves(piece,dirs){const out=[];for(const[dx,dy,dz]of dirs)addMoveIfValid(out,piece,piece.x+dx,piece.y+dy,piece.z+dz,false);return out;}
function rayMoves(piece,dirs){const out=[];for(const[dx,dy,dz]of dirs){for(let s=1;s<SIZE;s++){const x=piece.x+dx*s,y=piece.y+dy*s,z=piece.z+dz*s;if(!inside(x,y,z))break;const target=getPieceAt(x,y,z);if(!target)out.push({x,y,z,capture:false,target:null,jump:false});else{if(canCapture(piece,target))out.push({x,y,z,capture:true,target,jump:false});break;}}}return out;}
function rangerMoves(piece){const out=[];for(const[dx,dy,dz]of RANGER_DIRS)addMoveIfValid(out,piece,piece.x+dx,piece.y+dy,piece.z+dz,true);return out;}
function pseudoMoves(piece){if(!piece)return[];if(piece.type==='C')return stepMoves(piece,AXIS_DIRS);if(piece.type==='S')return stepMoves(piece,AXIS_DIRS);if(piece.type==='L')return rayMoves(piece,AXIS_DIRS);if(piece.type==='D')return rayMoves(piece,DIAG_DIRS);if(piece.type==='R')return rangerMoves(piece);return[];}
function attackSquares(piece){return pseudoMoves(piece).map(m=>({x:m.x,y:m.y,z:m.z}));}
function isSquareAttackedBy(x,y,z,attackerOwner){return pieces.filter(p=>p.owner===attackerOwner).some(p=>attackSquares(p).some(m=>m.x===x&&m.y===y&&m.z===z));}
function isInCheck(owner){const c=getCore(owner);return !c||isSquareAttackedBy(c.x,c.y,c.z,opponent(owner));}
function applyActionOnList(action,list){if(action.drop){const m=action.move||action;list.push({id:`tmp-${action.owner}-${action.type}-${m.x}-${m.y}-${m.z}`,owner:action.owner,type:action.type,x:m.x,y:m.y,z:m.z});return;}const moving=list.find(p=>p.id===action.pieceId);const target=list.find(p=>p.x===action.move.x&&p.y===action.move.y&&p.z===action.move.z);if(target&&canCapture(moving,target)){const idx=list.findIndex(p=>p.id===target.id);if(idx>=0)list.splice(idx,1);}if(moving){moving.x=action.move.x;moving.y=action.move.y;moving.z=action.move.z;}}
function withTemporaryAction(action,callback){const original=pieces;const temp=clonePieces(pieces);pieces=temp;applyActionOnList(action,temp);const result=callback(temp);pieces=original;return result;}
function legalMoves(piece){if(!piece)return[];return pseudoMoves(piece).filter(move=>withTemporaryAction({pieceId:piece.id,piece,move},()=>!isInCheck(piece.owner)));}
function allActionsFor(owner,legalOnly=true){
  const actions=[];
  pieces.filter(p=>p.owner===owner).forEach(piece=>{
    const moves=legalOnly?legalMoves(piece):pseudoMoves(piece);
    moves.forEach(move=>{
      actions.push({pieceId:piece.id,piece:piece,move:move,target:move.target||getPieceAt(move.x,move.y,move.z)});
    });
  });
  if(legalOnly){
    for(const type of (hands[owner]||[])){
      legalDrops(owner,type).forEach(m=>{
        actions.push({drop:true,owner:owner,type:type,move:m,target:null});
      });
    }
  }
  return actions;
}
function physicalCoreMoves(owner){
  const c=getCore(owner);
  if(!c)return[];
  const out=[];
  for(const[dx,dy,dz]of DELTAS_26){
    const x=c.x+dx,y=c.y+dy,z=c.z+dz;
    if(!inside(x,y,z))continue;
    const target=getPieceAt(x,y,z);
    // 包囲判定では「敵の利き」は見ない。
    // 物理的に動ける出口があるかだけを見る。
    // 全駒捕獲可能だが、包囲判定では物理的な出口だけを見る。
    if(!target || target.owner!==owner)out.push({x,y,z,capture:!!target,target});
  }
  return out;
}
function isCheckmate(owner){return isInCheck(owner)&&allActionsFor(owner,true).length===0;}
function isCoreSurrounded(owner){
  const c=getCore(owner);
  // 包囲勝ちは「チェック中」かつ「物理的な出口が0」の時だけ。
  // 自分の駒に埋まっただけでは負けにしない。
  return !!c && isInCheck(owner) && physicalCoreMoves(owner).length===0;
}
function isStalemate(owner){return !isInCheck(owner)&&allActionsFor(owner,true).length===0;}
function positionKey(){const board=pieces.map(p=>`${p.owner}${p.type}${p.x}${p.y}${p.z}`).sort().join('|');const hA=(hands.A||[]).slice().sort().join('');const hB=(hands.B||[]).slice().sort().join('');return `${turn}:${board}:HA${hA}:HB${hB}`;}function recordPosition(){if(winner||drawReason)return;const k=positionKey();const n=(positionCounts.get(k)||0)+1;positionCounts.set(k,n);if(n>=3){winner='draw';winReason='repetition';drawReason='三復同型：同じ局面が3回出現したため引き分け。';moveHistory.push(drawReason);clearTimeout(aiTimer);}}
function tempPositionKeyForAction(action){const oldP=pieces,oldT=turn,oldH=hands;const temp=clonePieces(pieces);const tempH={A:[...(hands.A||[])],B:[...(hands.B||[])]};pieces=temp;hands=tempH;applySearchAction(action);turn=opponent(actionOwner(action));const k=positionKey();pieces=oldP;hands=oldH;turn=oldT;return k;}
function changeMode(){gameMode=document.getElementById('modeSelect').value;resetGame();}function changeAiLevel(){aiLevel=Number(document.getElementById('aiLevelSelect').value);draw();}function changeSpeed(){aiDelay=Number(document.getElementById('speedSelect').value);draw();}
function resetGame(opts={}){clearTimeout(aiTimer);pieces=clonePieces(startPieces);turn='A';selectedId=null;winner=null;winReason=null;drawReason=null;moveNumber=1;moveHistory=['対局開始'];lastAiReason='まだAIは指していません。';positionCounts=new Map();lastMoveRecord=null;gameStatsRecorded=false;currentMetrics=freshMetrics();hands={A:[],B:[]};selectedDrop=null;recordPosition();if(!opts.silent){draw();scheduleAiIfNeeded();}}
function scheduleAiIfNeeded(){clearTimeout(aiTimer);if(winner||drawReason)return;if(gameMode==='ai'&&turn===AI_OWNER)aiTimer=setTimeout(makeAiMove,aiDelay);if(gameMode==='aivai')aiTimer=setTimeout(makeAiMove,aiDelay);}

function dropLayer(owner){return owner==='A'?2:3;}
function handCounts(owner){const c=blankTypeCounts();(hands[owner]||[]).forEach(t=>{if(c[t]!==undefined)c[t]++;});return c;}
function legalDrops(owner,type){
  const z=dropLayer(owner), out=[];
  for(let x=1;x<=SIZE;x++)for(let y=1;y<=SIZE;y++){
    if(!getPieceAt(x,y,z)){
      const action={drop:true,owner,type,x,y,z};
      if(withTemporaryAction(action,()=>!isInCheck(owner))) out.push({x,y,z,drop:true,type});
    }
  }
  return out;
}
function selectDrop(owner,type){
  if(winner||drawReason||owner!==turn||gameMode==='aivai'||(gameMode==='ai'&&turn===AI_OWNER))return;
  if(!(hands[owner]||[]).includes(type))return;
  selectedId=null;selectedDrop={owner,type};draw();
}
function dropSelectedTo(x,y,z){
  if(winner||drawReason||!selectedDrop)return false;
  const m=legalDrops(selectedDrop.owner,selectedDrop.type).find(q=>q.x===x&&q.y===y&&q.z===z);
  if(!m)return false;
  executeDrop(selectedDrop.owner,selectedDrop.type,x,y,z,false,'');
  return true;
}
function executeDrop(owner,type,x,y,z,isAi,reason){
  const idx=hands[owner].indexOf(type); if(idx<0)return;
  hands[owner].splice(idx,1);
  const id=`${owner}-${type}-drop-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const piece={id,owner,type,x,y,z}; pieces.push(piece);
  if(currentMetrics.moveCounts[owner]&&currentMetrics.moveCounts[owner][type]!==undefined)currentMetrics.moveCounts[owner][type]++;
  if(moveNumber===1&&!currentMetrics.firstMove){currentMetrics.firstMove=`打 ${type} (${x},${y},${z})`;}
  moveHistory.push(`${moveNumber}. ${ownerName(owner)}${isAi?'AI':''} 打 ${shapes[type]}${type} → (${x},${y},${z})${isInCheck(opponent(owner))?'+':''}`);
  moveNumber++; selectedDrop=null; selectedId=null; lastMoveRecord=null; if(reason)lastAiReason=reason;
  turn=opponent(turn);
  if(isCoreSurrounded(turn)){winner=opponent(turn);winReason='surround';markFinish(winner,turn,type);moveHistory.push(`${ownerName(turn)}コアが包囲されました。${ownerName(winner)}の包囲勝ち。`);}else if(isCheckmate(turn)){winner=opponent(turn);winReason='mate';markFinish(winner,turn,type);}else if(isStalemate(turn)){winner=opponent(turn);winReason='stalemate';moveHistory.push(`${ownerName(turn)}軍が完全に封鎖されました。${ownerName(winner)}の封鎖勝ち。`);}else recordPosition();
  if(isInCheck(turn))currentMetrics.checks[opponent(turn)]++;
  if(!batchRunning){draw();scheduleAiIfNeeded();}
}

function selectPiece(id){if(winner||drawReason||gameMode==='aivai'||(gameMode==='ai'&&turn===AI_OWNER))return;const p=pieces.find(q=>q.id===id);if(!p||p.owner!==turn)return;selectedDrop=null;selectedId=id;draw();}
function moveSelectedTo(x,y,z){if(winner||drawReason||!selectedId)return;const p=pieces.find(q=>q.id===selectedId);const m=legalMoves(p).find(q=>q.x===x&&q.y===y&&q.z===z);if(!m)return;executeMove(p,m,false,'');}
function executeMove(moving,move,isAi,reason){const from={x:moving.x,y:moving.y,z:moving.z};const target=getPieceAt(move.x,move.y,move.z);if(target&&canCapture(moving,target)){currentMetrics.captures[moving.owner]++;if(target.type==='C'){winner=moving.owner;winReason='capture';markFinish(moving.owner,target.owner,moving.type);}else{hands[moving.owner].push(target.type);}pieces=pieces.filter(p=>p.id!==target.id);}if(currentMetrics.moveCounts[moving.owner]&&currentMetrics.moveCounts[moving.owner][moving.type]!==undefined)currentMetrics.moveCounts[moving.owner][moving.type]++;if(moveNumber===1&&!currentMetrics.firstMove){currentMetrics.firstMove=`${moving.type} ${coord(from)}→${coord(move)}`;}moving.x=move.x;moving.y=move.y;moving.z=move.z;if(moving.type==='C')currentMetrics.coreMoves[moving.owner]++;addMoveLog(moving.owner,moving,from,move,target,isAi,reason);selectedId=null;if(winner){draw();return;}turn=opponent(turn);if(isCoreSurrounded(turn)){winner=opponent(turn);winReason='surround';markFinish(winner,turn,moving.type);moveHistory.push(`${ownerName(turn)}コアが包囲されました。${ownerName(winner)}の包囲勝ち。`);}else if(isCheckmate(turn)){winner=opponent(turn);winReason='mate';markFinish(winner,turn,moving.type);}else if(isStalemate(turn)){winner=opponent(turn);winReason='stalemate';moveHistory.push(`${ownerName(turn)}軍が完全に封鎖されました。${ownerName(winner)}の封鎖勝ち。`);}else recordPosition();if(isInCheck(turn))currentMetrics.checks[opponent(turn)]++;if(!batchRunning){draw();scheduleAiIfNeeded();}}
function addMoveLog(owner,piece,from,to,target,isAi,reason){const cap=(target&&canCapture(piece,target))?` × ${ownerName(target.owner)}${shapes[target.type]}${target.type}`:'';const check=target&&target.type==='C'?'#':(isInCheck(opponent(owner))?'+':'');moveHistory.push(`${moveNumber}. ${ownerName(owner)}${isAi?'AI':''} ${shapes[piece.type]}${piece.type} ${coord(from)} → ${coord(to)}${cap}${check}`);moveNumber++;lastMoveRecord={pieceId:piece.id,owner,from:{...from},to:{x:to.x,y:to.y,z:to.z}};if(reason)lastAiReason=reason;}
function distanceToCore(owner,x,y,z){const c=getCore(owner);return c?Math.max(Math.abs(x-c.x),Math.abs(y-c.y),Math.abs(z-c.z)):0;}
function scoreAction(action){if(aiLevel===1)return{score:Math.random()*100,lines:['ランダム']};if(action.drop){const own=action.owner,opp=opponent(own),move=action.move||action;let score=15+pieceValue[action.type]*2+Math.random()*3;const lines=[`持ち駒${action.type}を第${dropLayer(own)}層へ投入`];const check=withTemporaryAction(action,()=>isInCheck(opp));if(check){score+=70;lines.push('打ち込みチェック +70');}const exits=withTemporaryAction(action,()=>physicalCoreMoves(opp).length);score+=(6-exits)*(aiLevel>=4?8:4);lines.push(`敵コア物理逃げ道 ${exits}`);return{score,lines};}const{piece,move,target}=action;const own=piece.owner,opp=opponent(own);const lines=[];let score=Math.random()*3;if(target&&target.type==='C')return{score:100000,lines:['コア捕獲勝ち +100000']};const before=distanceToCore(opp,piece.x,piece.y,piece.z),after=distanceToCore(opp,move.x,move.y,move.z);const approach=(before-after)*(aiLevel>=3?18:10);score+=approach;lines.push(`敵コア接近 ${before}→${after} ${approach>=0?'+':''}${approach.toFixed(1)}`);const center=6-(Math.abs(move.x-2.5)+Math.abs(move.y-2.5)+Math.abs(move.z-2.5));score+=center*(aiLevel>=3?3:1.5);const check=withTemporaryAction(action,()=>isInCheck(opp));const surround=withTemporaryAction(action,()=>isCoreSurrounded(opp)?50000:0);score+=surround;if(surround)lines.push('包囲勝ち +50000');if(check){score+=70;lines.push('チェック +70');}const exits=withTemporaryAction(action,()=>physicalCoreMoves(opp).length);score+=(6-exits)*(aiLevel>=4?10:6);lines.push(`敵コア物理逃げ道 ${exits}`);if(aiLevel>=3){const seen=positionCounts.get(tempPositionKeyForAction(action))||0;if(seen===1){score-=200;lines.push('反復回避 -200');}if(seen>=2){score-=5000;lines.push('三復回避 -5000');}}if(aiLevel>=4&&lastMoveRecord&&lastMoveRecord.pieceId===piece.id&&lastMoveRecord.from.x===move.x&&lastMoveRecord.from.y===move.y&&lastMoveRecord.from.z===move.z){score-=300;lines.push('即戻り -300');}return{score,lines};}
function actionOwner(action){return action.drop?action.owner:action.piece.owner;}
function cloneHandsObj(h){return{A:[...(h.A||[])],B:[...(h.B||[])]};}
function terminalForSide(side){
  if(isCoreSurrounded(side))return{winner:opponent(side),reason:'surround'};
  const actions=allActionsFor(side,true);
  if(!actions.length)return{winner:opponent(side),reason:isInCheck(side)?'mate':'stalemate'};
  return null;
}
function applySearchAction(action){
  const owner=actionOwner(action);
  if(action.drop){
    const m=action.move||action;
    const idx=(hands[owner]||[]).indexOf(action.type);
    if(idx>=0)hands[owner].splice(idx,1);
    pieces.push({id:`search-${owner}-${action.type}-${m.x}-${m.y}-${m.z}-${Math.random()}`,owner,type:action.type,x:m.x,y:m.y,z:m.z});
    return;
  }
  const moving=pieces.find(p=>p.id===action.pieceId);
  if(!moving)return;
  const target=pieces.find(p=>p.x===action.move.x&&p.y===action.move.y&&p.z===action.move.z);
  if(target&&target.owner!==moving.owner){
    pieces=pieces.filter(p=>p.id!==target.id);
    if(target.type!=='C')hands[moving.owner].push(target.type);
  }
  moving.x=action.move.x;moving.y=action.move.y;moving.z=action.move.z;
}
function withSearchAction(action,nextTurn,callback){
  const oldP=pieces,oldH=hands,oldT=turn;
  pieces=clonePieces(pieces);hands=cloneHandsObj(hands);turn=nextTurn;
  applySearchAction(action);
  const r=callback();
  pieces=oldP;hands=oldH;turn=oldT;
  return r;
}
function staticEvaluate(root){
  const opp=opponent(root);
  const rootCore=getCore(root), oppCore=getCore(opp);
  if(!rootCore)return-1000000;
  if(!oppCore)return 1000000;
  const material=(owner)=>pieces.filter(p=>p.owner===owner).reduce((s,p)=>s+pieceValue[p.type],0)+(hands[owner]||[]).reduce((s,t)=>s+pieceValue[t]*1.15,0);
  const mobility=(owner)=>allActionsFor(owner,true).length;
  const exits=(owner)=>physicalCoreMoves(owner).length;
  const centerScore=(owner)=>pieces.filter(p=>p.owner===owner).reduce((s,p)=>s+(6-(Math.abs(p.x-2.5)+Math.abs(p.y-2.5)+Math.abs(p.z-2.5)))*0.7,0);
  const attackBonus=(owner)=>isInCheck(opponent(owner))?80:0;
  let score=0;
  score+=material(root)-material(opp);
  score+=(mobility(root)-mobility(opp))*0.8;
  score+=(6-exits(opp))*22-(6-exits(root))*18;
  score+=centerScore(root)-centerScore(opp);
  score+=attackBonus(root)-attackBonus(opp);
  if(isInCheck(root))score-=90;
  if(isInCheck(opp))score+=90;
  return score;
}
function quickRankScore(action,root){
  const s=scoreAction(action).score;
  const owner=actionOwner(action),opp=opponent(owner);
  let bonus=0;
  withSearchAction(action,opponent(owner),()=>{
    if(!getCore(opp))bonus+=1000000;
    const t=terminalForSide(opp); if(t&&t.winner===owner)bonus+=800000;
  });
  return s+bonus+(owner===root?0:0);
}
const DEEP_LIMITS={6:{depth:1,width:12,nodes:700,time:80},7:{depth:2,width:8,nodes:1200,time:110},8:{depth:3,width:6,nodes:1800,time:150},9:{depth:4,width:5,nodes:2600,time:210},10:{depth:5,width:4,nodes:3600,time:280}};
let searchNodes=0,searchDeadline=0,searchAborted=false;
function deepCfg(){return DEEP_LIMITS[aiLevel]||DEEP_LIMITS[6];}
function candidateLimit(depth){return deepCfg().width;}
function rankedLimitedActions(side,root,width){
  let actions=allActionsFor(side,true);
  actions=actions.map(a=>({a,rank:quickRankScore(a,root)+Math.random()*0.001})).sort((x,y)=>y.rank-x.rank);
  return actions.slice(0,width).map(x=>x.a);
}
function minimax(side,root,depth,alpha,beta){
  searchNodes++;
  const cfg=deepCfg();
  if(searchNodes>cfg.nodes || performance.now()>searchDeadline){searchAborted=true;return staticEvaluate(root);}
  const term=terminalForSide(side);
  if(term)return term.winner===root?900000+depth:-900000-depth;
  if(depth<=0)return staticEvaluate(root);
  let actions=rankedLimitedActions(side,root,candidateLimit(depth));
  if(side===root){
    let best=-Infinity;
    for(const a of actions){const v=withSearchAction(a,opponent(side),()=>minimax(opponent(side),root,depth-1,alpha,beta));best=Math.max(best,v);alpha=Math.max(alpha,v);if(beta<=alpha||searchAborted)break;}
    return best;
  }else{
    let best=Infinity;
    for(const a of actions){const v=withSearchAction(a,opponent(side),()=>minimax(opponent(side),root,depth-1,alpha,beta));best=Math.min(best,v);beta=Math.min(beta,v);if(beta<=alpha||searchAborted)break;}
    return best;
  }
}
function chooseDeepAction(side){
  const cfg=deepCfg();
  const depth=cfg.depth;
  searchNodes=0; searchAborted=false; searchDeadline=performance.now()+cfg.time;
  let actions=rankedLimitedActions(side,side,cfg.width);
  let best=null,bestScore=-Infinity;
  for(const a of actions){
    const v=withSearchAction(a,opponent(side),()=>minimax(opponent(side),side,depth-1,-Infinity,Infinity));
    const jitter=Math.random()*0.05;
    if(v+jitter>bestScore){bestScore=v+jitter;best=a;}
    if(searchAborted)break;
  }
  if(!best){
    const fallback=allActionsFor(side,true).map(a=>({action:a,...scoreAction(a)})).sort((a,b)=>b.score-a.score)[0];
    fallback.lines.unshift('探索上限により即時評価へフォールバック');
    return fallback;
  }
  const base=scoreAction(best);
  base.score=bestScore;
  base.lines.unshift(`${depth}手読み / 幅${cfg.width} / 探索${searchNodes}局面${searchAborted?' / 上限到達':''}`);
  return{action:best,score:bestScore,lines:base.lines};
}
function makeAiMove(){if(winner||drawReason||gameMode==='human')return;const side=gameMode==='aivai'?turn:AI_OWNER;if(gameMode==='ai'&&turn!==AI_OWNER)return;if(isCoreSurrounded(side)){winner=opponent(side);winReason='surround';if(!batchRunning)draw();return;}const actions=allActionsFor(side,true);if(!actions.length){winner=opponent(side);winReason=isInCheck(side)?'mate':'stalemate';if(winReason==='stalemate')moveHistory.push(`${ownerName(side)}軍が完全に封鎖されました。${ownerName(winner)}の封鎖勝ち。`);if(!batchRunning)draw();return;}const best=aiLevel>=6?chooseDeepAction(side):actions.map(a=>({action:a,...scoreAction(a)})).sort((a,b)=>b.score-a.score)[0];if(best.action.drop){const reason=`${ownerName(side)}AI：打 ${shapes[best.action.type]}${best.action.type} → (${best.action.move.x},${best.action.move.y},${best.action.move.z})\n評価：${best.score.toFixed(1)}\n・${best.lines.join('\n・')}`;executeDrop(side,best.action.type,best.action.move.x,best.action.move.y,best.action.move.z,true,reason);return;}const moving=pieces.find(p=>p.id===best.action.pieceId);const reason=`${ownerName(side)}AI：${shapes[moving.type]}${moving.type} ${coord(moving)} → ${coord(best.action.move)}\n評価：${best.score.toFixed(1)}\n・${best.lines.join('\n・')}`;executeMove(moving,best.action.move,true,reason);}
function reasonLabel(reason){return reason==='capture'?'コア捕獲勝ち':reason==='mate'?'詰み勝ち':reason==='surround'?'包囲勝ち':reason==='stalemate'?'封鎖勝ち':reason==='repetition'?'三復同型':reason==='move_limit'?'手数上限':(reason||'');}
function recordCompletedGame(){if(gameStatsRecorded||(!winner&&!drawReason))return;gameStatsRecorded=true;const moves=Math.max(0,moveNumber-1);aggregateStats.games++;if(winner==='A')aggregateStats.blueWins++;else if(winner==='B')aggregateStats.redWins++;else aggregateStats.draws++;if(winReason==='mate')aggregateStats.mateWins++;else if(winReason==='capture')aggregateStats.captureWins++;else if(winReason==='surround')aggregateStats.surroundWins++;else if(winReason==='stalemate')aggregateStats.stalemateWins++;else if(winReason==='repetition')aggregateStats.repetitions++;else if(winReason==='move_limit')aggregateStats.moveLimit++;aggregateStats.totalMoves+=moves;aggregateStats.minMoves=aggregateStats.minMoves===null?moves:Math.min(aggregateStats.minMoves,moves);aggregateStats.maxMoves=Math.max(aggregateStats.maxMoves,moves);aggregateStats.blueChecks+=currentMetrics.checks.A;aggregateStats.redChecks+=currentMetrics.checks.B;aggregateStats.blueCaptures+=currentMetrics.captures.A;aggregateStats.redCaptures+=currentMetrics.captures.B;aggregateStats.blueCoreMoves+=currentMetrics.coreMoves.A;aggregateStats.redCoreMoves+=currentMetrics.coreMoves.B;addCounts(aggregateStats.moveCounts.A,currentMetrics.moveCounts.A);addCounts(aggregateStats.moveCounts.B,currentMetrics.moveCounts.B);addCounts(aggregateStats.finishTypes,currentMetrics.finishTypes);addCounts(aggregateStats.wallTypes,currentMetrics.wallTypes);if(currentMetrics.firstMove)aggregateStats.firstMoves[currentMetrics.firstMove]=(aggregateStats.firstMoves[currentMetrics.firstMove]||0)+1;gameRecords.push({game:aggregateStats.games,winner:winner==='A'?'青':winner==='B'?'赤':'引分',reason:reasonLabel(winReason)||drawReason||'',moves,blueChecks:currentMetrics.checks.A,redChecks:currentMetrics.checks.B,blueCaptures:currentMetrics.captures.A,redCaptures:currentMetrics.captures.B,blueCoreMoves:currentMetrics.coreMoves.A,redCoreMoves:currentMetrics.coreMoves.B,bluePieces:pieces.filter(p=>p.owner==='A').length,redPieces:pieces.filter(p=>p.owner==='B').length,blueMoveC:currentMetrics.moveCounts.A.C,blueMoveS:currentMetrics.moveCounts.A.S,blueMoveL:currentMetrics.moveCounts.A.L,blueMoveD:currentMetrics.moveCounts.A.D,blueMoveR:currentMetrics.moveCounts.A.R,redMoveC:currentMetrics.moveCounts.B.C,redMoveS:currentMetrics.moveCounts.B.S,redMoveL:currentMetrics.moveCounts.B.L,redMoveD:currentMetrics.moveCounts.B.D,redMoveR:currentMetrics.moveCounts.B.R,finishC:currentMetrics.finishTypes.C,finishS:currentMetrics.finishTypes.S,finishL:currentMetrics.finishTypes.L,finishD:currentMetrics.finishTypes.D,finishR:currentMetrics.finishTypes.R,wallC:currentMetrics.wallTypes.C,wallS:currentMetrics.wallTypes.S,wallL:currentMetrics.wallTypes.L,wallD:currentMetrics.wallTypes.D,wallR:currentMetrics.wallTypes.R,firstMove:currentMetrics.firstMove});updateStatsPanel();}
function avg(n,d){return d?(n/d).toFixed(2):'0.00'}function pct(n,d){return d?`${(n/d*100).toFixed(1)}%`:'0.0%'}function updateStatsPanel(){const s=aggregateStats,el=document.getElementById('statsPanel');if(!s.games){el.textContent=batchRunning?`実行中 ${batchCompletedCount}/${batchTargetCount}`:'まだ統計はありません。';return;}el.innerHTML=`総対局 ${s.games}<br>青勝ち ${s.blueWins} (${pct(s.blueWins,s.games)}) / 赤勝ち ${s.redWins} (${pct(s.redWins,s.games)}) / 引分 ${s.draws}<br>平均手数 ${avg(s.totalMoves,s.games)} / 最短 ${s.minMoves} / 最長 ${s.maxMoves}<br>コア捕獲勝ち ${s.captureWins} / 詰み勝ち ${s.mateWins} / 包囲勝ち ${s.surroundWins} / 封鎖勝ち ${s.stalemateWins} / 三復 ${s.repetitions} / 手数上限 ${s.moveLimit}<br>平均王手 青${avg(s.blueChecks,s.games)} 赤${avg(s.redChecks,s.games)}<br>平均コア移動 青${avg(s.blueCoreMoves,s.games)} 赤${avg(s.redCoreMoves,s.games)}<br><br><b>駒別平均移動</b><br>青：${avgTypeText(s.moveCounts.A,s.games)}<br>赤：${avgTypeText(s.moveCounts.B,s.games)}<br><br><b>決着時チェック駒</b><br>${avgTypeText(s.finishTypes,s.games)}<br><br><b>終局時の壁貢献</b><br>${avgTypeText(s.wallTypes,s.games)}<br><br><b>初手分布 Top5</b><br>${topFirstMoves(5)}`;}
function resetStats(){aggregateStats=freshStats();gameRecords=[];updateStatsPanel();}function runBatchGames(count){clearTimeout(aiTimer);if(batchRunning)return;const prev=gameMode;gameMode='aivai';batchRunning=true;batchTargetCount=count;batchCompletedCount=0;updateStatsPanel();function play(){resetGame({silent:true});let guard=0;while(!winner&&!drawReason&&guard<200){makeAiMove();guard++;}if(!winner&&!drawReason){winner='draw';winReason='move_limit';drawReason='200手上限';}recordCompletedGame();batchCompletedCount++;}function step(){let n=0;while(batchCompletedCount<count&&n<(aiLevel>=8?1:3)){play();n++;}updateStatsPanel();if(batchCompletedCount<count)setTimeout(step,0);else{batchRunning=false;gameMode=prev;resetGame({silent:true});draw();scheduleAiIfNeeded();}}setTimeout(step,0);}function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}function downloadStatsCsv(){if(!gameRecords.length){alert('統計がありません');return;}const h=Object.keys(gameRecords[0]);const rows=[h.join(',')].concat(gameRecords.map(r=>h.map(k=>csvEscape(r[k])).join(',')));const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`strata_mini_core_only_stats_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

function drawHands(){
  const el=document.getElementById('handsBox'); if(!el)return;
  function side(owner){const c=handCounts(owner);const cls=owner==='A'?'blue':'red';let html=`<div class="evalcard"><b class="${cls}">${ownerName(owner)} CAPTURED</b><br><span class="note">打てる層：第${dropLayer(owner)}層</span><br>`;for(const t of ['S','L','D','R']){for(let i=0;i<c[t];i++){const sel=selectedDrop&&selectedDrop.owner===owner&&selectedDrop.type===t?' sel':'';html+=`<span class="handpiece${sel}" onclick="selectDrop('${owner}','${t}')">${shapes[t]}${t}</span>`;}}if(!hands[owner].length)html+='<span class="note">なし</span>';return html+'</div>';}
  el.innerHTML=side('A')+side('B');
}

function evaluateSide(owner){const material=pieces.filter(p=>p.owner===owner).reduce((s,p)=>s+pieceValue[p.type],0)+(hands[owner]||[]).reduce((s,t)=>s+pieceValue[t]*0.8,0);const mobility=allActionsFor(owner,true).length;const check=isInCheck(owner);return{material,mobility,check,score:material+mobility*.3-(check?50:0)}}function drawEvaluation(){const a=evaluateSide('A'),b=evaluateSide('B');document.getElementById('evalBox').innerHTML=`<div class="evalcard"><b class="blue">青</b><br>評価:${a.score.toFixed(1)}<br>駒価値:${a.material}<br>合法手:${a.mobility}<br>${a.check?'チェック':'安全'}</div><div class="evalcard"><b class="red">赤</b><br>評価:${b.score.toFixed(1)}<br>駒価値:${b.material}<br>合法手:${b.mobility}<br>${b.check?'チェック':'安全'}</div>`;}
function project(x,y,z){const l=LAYER_LAYOUT[z];return{sx:l.ox+(x-1)*CELL_W+(y-1)*SKEW_X,sy:l.oy-(y-1)*CELL_H};}function cellCenter(x,y,z){const p=project(x,y,z);return{sx:p.sx+CELL_W*.5,sy:p.sy-CELL_H*.5};}function pathForCell(x,y,z){const p=project(x,y,z),a={x:p.sx,y:p.sy},b={x:p.sx+CELL_W,y:p.sy},c={x:p.sx+CELL_W+SKEW_X,y:p.sy-CELL_H},d={x:p.sx+SKEW_X,y:p.sy-CELL_H};return`M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y} L${d.x},${d.y} Z`;}function svgEl(n,a={}){const e=document.createElementNS('http://www.w3.org/2000/svg',n);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);return e;}function addText(svg,t,x,y,a={}){const e=svgEl('text',{x,y,...a});e.textContent=t;svg.appendChild(e);return e;}
function attackedMap(owner){const set=new Set();pieces.filter(p=>p.owner===owner).forEach(p=>attackSquares(p).forEach(m=>set.add(key(m.x,m.y,m.z))));return set;}
function drawLayer(svg,z,moveMap,attA,attB){
  const l=LAYER_LAYOUT[z],tl=project(1,SIZE,z),lx=tl.sx+(isMobileBoard()?150:205),ly=tl.sy-(isMobileBoard()?42:58);
  // 公開版は「板」ではなく、各層を独立した読みやすいグリッドとして描画する。
  // 大きな斜めプレート装飾を消すことで、どのマスがどの層に属するかを明確にする。
  svg.appendChild(svgEl('rect',{x:lx-66,y:ly-29,width:132,height:40,rx:12,fill:'rgba(2,6,23,.82)',stroke:l.color,'stroke-width':1.8}));
  addText(svg,l.name,lx,ly-5,{fill:'#e0faff','font-size':18,'font-weight':950,'text-anchor':'middle'});
  addText(svg,`LAYER ${z}`,lx,ly+15,{fill:'rgba(186,230,253,.72)','font-size':10,'font-weight':900,'text-anchor':'middle','letter-spacing':1.2});
  for(let x=1;x<=SIZE;x++)for(let y=1;y<=SIZE;y++){
    const k=key(x,y,z),m=moveMap.get(k);
    let fill=(x+y)%2===0?'rgba(15,39,78,.50)':'rgba(2,18,44,.50)';
    let stroke='rgba(125,211,252,.46)',sw=1.65;
    if(attA.has(k)&&attB.has(k))fill='rgba(245,158,11,.16)';
    else if(attA.has(k))fill='rgba(14,165,233,.16)';
    else if(attB.has(k))fill='rgba(244,63,94,.16)';
    if(m){fill=m.drop?'rgba(168,85,247,.44)':(m.capture?'rgba(251,113,133,.50)':'rgba(52,211,153,.40)');stroke=m.capture?'#fb7185':(m.drop?'#c084fc':'#34d399');sw=3.4;}
    const path=svgEl('path',{d:pathForCell(x,y,z),fill,stroke,'stroke-width':sw,class:'cell'});
    path.addEventListener('click',()=>{if(!dropSelectedTo(x,y,z))moveSelectedTo(x,y,z);});
    svg.appendChild(path);
    const cc=cellCenter(x,y,z);
    addText(svg,`${x},${y}`,cc.sx,cc.sy+3,{fill:'rgba(203,213,225,.46)','font-size':10,'font-weight':800,'text-anchor':'middle','pointer-events':'none'});
  }
}
function draw(){
  const svg=document.getElementById('board');svg.innerHTML='';
  const defs=svgEl('defs');
  const glow=svgEl('filter',{id:'softGlow',x:'-30%',y:'-30%',width:'160%',height:'160%'}); glow.appendChild(svgEl('feDropShadow',{dx:0,dy:0,stdDeviation:5,'flood-color':'#38bdf8','flood-opacity':.35})); defs.appendChild(glow);
  const pieceGlow=svgEl('filter',{id:'pieceGlow',x:'-40%',y:'-40%',width:'180%',height:'180%'}); pieceGlow.appendChild(svgEl('feDropShadow',{dx:0,dy:0,stdDeviation:4,'flood-color':'#ffffff','flood-opacity':.30})); defs.appendChild(pieceGlow); svg.appendChild(defs);
  svg.appendChild(svgEl('rect',{x:0,y:0,width:980,height:1040,fill:'#020817'}));
  // 背景装飾は控えめに。盤面のセル読み取りを最優先。
  svg.appendChild(svgEl('rect',{x:24,y:24,width:932,height:992,rx:22,fill:'none',stroke:'rgba(125,211,252,.10)','stroke-width':1}));
  const selected=pieces.find(p=>p.id===selectedId),moves=selectedDrop?legalDrops(selectedDrop.owner,selectedDrop.type):legalMoves(selected),moveMap=new Map(moves.map(m=>[key(m.x,m.y,m.z),m])),attA=attackedMap('A'),attB=attackedMap('B');
  [4,3,2,1].forEach(z=>drawLayer(svg,z,moveMap,attA,attB));
  pieces.forEach(p=>{
    const c=cellCenter(p.x,p.y,p.z),isBlue=p.owner==='A',stroke=isBlue?'#38bdf8':'#fb7185',fill=isBlue?'url(#bluePiece)':'url(#redPiece)',inCheck=p.type==='C'&&isInCheck(p.owner);
    if(!document.getElementById('bluePiece')){
      const defs=svg.querySelector('defs');
      const bg=svgEl('linearGradient',{id:'bluePiece',x1:'0',x2:'0',y1:'0',y2:'1'});bg.appendChild(svgEl('stop',{offset:'0%','stop-color':'#e0f2fe'}));bg.appendChild(svgEl('stop',{offset:'45%','stop-color':'#38bdf8'}));bg.appendChild(svgEl('stop',{offset:'100%','stop-color':'#075985'}));defs.appendChild(bg);
      const rg=svgEl('linearGradient',{id:'redPiece',x1:'0',x2:'0',y1:'0',y2:'1'});rg.appendChild(svgEl('stop',{offset:'0%','stop-color':'#ffe4e6'}));rg.appendChild(svgEl('stop',{offset:'45%','stop-color':'#fb7185'}));rg.appendChild(svgEl('stop',{offset:'100%','stop-color':'#881337'}));defs.appendChild(rg);
    }
    const g=svgEl('g',{class:'piece',transform:`translate(${c.sx},${c.sy})`,filter:'url(#pieceGlow)'});g.addEventListener('click',e=>{e.stopPropagation();selectPiece(p.id)});
    g.appendChild(svgEl('ellipse',{cx:3,cy:12,rx:24,ry:9,fill:'rgba(0,0,0,.34)'}));
    const shape=p.type==='C'?'circle':(p.type==='D'?'rect':'circle');
    if(p.type==='D')g.appendChild(svgEl('rect',{x:-18,y:-18,width:36,height:36,rx:4,transform:'rotate(45)',fill:inCheck?'#fef3c7':fill,stroke:p.id===selectedId?'#ffffff':(inCheck?'#fbbf24':stroke),'stroke-width':p.id===selectedId?5:3}));
    else g.appendChild(svgEl('circle',{r:p.type==='L'?20:22,fill:inCheck?'#fef3c7':fill,stroke:p.id===selectedId?'#ffffff':(inCheck?'#fbbf24':stroke),'stroke-width':p.id===selectedId?5:3}));
    const txt=svgEl('text',{'text-anchor':'middle','dominant-baseline':'central','font-size':p.type==='L'?20:22,'font-weight':1000,fill:'#f8fbff',stroke:'rgba(2,6,23,.55)','stroke-width':2,'paint-order':'stroke'});txt.textContent=shapes[p.type];g.appendChild(txt);
    const lab=svgEl('text',{x:21,y:-17,'font-size':13,'font-weight':1000,fill:'#eaf6ff',stroke:'rgba(2,6,23,.9)','stroke-width':4,'paint-order':'stroke'});lab.textContent=p.type;g.appendChild(lab);svg.appendChild(g);
  });
  document.getElementById('turnLabel').textContent=ownerName(turn);document.getElementById('turnLabel').className=turn==='A'?'blue':'red';document.getElementById('modeHelp').textContent=gameMode==='human'?'人間 vs 人間です。':'赤がAIです。';if(winner||drawReason)recordCompletedGame();const cb=document.getElementById('checkBox');if(!winner&&isInCheck(turn)){cb.style.display='block';cb.textContent=`${ownerName(turn)}コアがチェックされています。`;}else cb.style.display='none';const wb=document.getElementById('winnerBox');if(winner){wb.style.display='block';wb.textContent=winner==='draw'?(drawReason||'引き分け'):(winReason==='surround'?`${ownerName(winner)}の包囲勝ち！相手コアを包囲しました。`:(winReason==='mate'?`${ownerName(winner)}の詰み勝ち！相手コアを詰ませました。`:(winReason==='stalemate'?`${ownerName(winner)}の封鎖勝ち！相手軍を完全に封鎖しました。`:`${ownerName(winner)}のコア捕獲勝ち！相手コアを捕獲しました。`)));}else wb.style.display='none';document.getElementById('moveLog').textContent=moveHistory.join('\n');document.getElementById('aiReason').textContent=lastAiReason;drawHands();drawEvaluation();updateStatsPanel();}


const STORAGE_KEY='strata-save-v3';
let deferredInstallPrompt=null;
function snapshotGame(){return{pieces,turn,winner,winReason,drawReason,moveNumber,moveHistory,gameMode,aiLevel,aiDelay,lastAiReason,lastMoveRecord,hands,currentMetrics,positionCounts:[...positionCounts.entries()]};}
function saveGame(){try{if(pieces&&hands)localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshotGame()));}catch(e){}}
function loadSavedGame(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;const s=JSON.parse(raw);if(!s||!Array.isArray(s.pieces))return false;pieces=s.pieces;turn=s.turn||'A';winner=s.winner||null;winReason=s.winReason||null;drawReason=s.drawReason||null;moveNumber=s.moveNumber||1;moveHistory=s.moveHistory||['対局開始'];gameMode=s.gameMode||gameMode;aiLevel=Number(s.aiLevel||aiLevel||3);aiDelay=Number(s.aiDelay||aiDelay||350);lastAiReason=s.lastAiReason||lastAiReason;lastMoveRecord=s.lastMoveRecord||null;hands=s.hands||{A:[],B:[]};currentMetrics=s.currentMetrics||freshMetrics();positionCounts=new Map(s.positionCounts||[]);selectedId=null;selectedDrop=null;return true;}catch(e){return false;}}
function clearSavedGame(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}
function toggleMobileMenu(){document.body.classList.toggle('mobile-menu-open');}
const originalDraw=draw;
draw=function(){originalDraw();const m=document.getElementById('turnLabelMobile');if(m){m.textContent=ownerName(turn);m.className=turn==='A'?'blue':'red';}const mh=document.getElementById('turnLabelHeaderMobile');if(mh){mh.textContent=ownerName(turn);mh.className=turn==='A'?'blue':'red';}saveGame();};
function scrollToRules(){const cards=document.querySelectorAll('.side .card');const target=cards[3]||cards[0];if(target){target.style.display='block';target.scrollIntoView({behavior:'smooth',block:'start'});}}
function updateOnlineState(){const pill=document.getElementById('offlinePill');if(pill)pill.classList.toggle('show',!navigator.onLine);}
window.addEventListener('online',updateOnlineState);window.addEventListener('offline',updateOnlineState);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;const b=document.getElementById('installBanner');if(b)b.classList.add('show');});
window.addEventListener('appinstalled',()=>{const b=document.getElementById('installBanner');if(b)b.classList.remove('show');deferredInstallPrompt=null;});
window.addEventListener('load',()=>{updateOnlineState();const btn=document.getElementById('installBtn');if(btn)btn.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;const b=document.getElementById('installBanner');if(b)b.classList.remove('show');});if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);});


const guidePages=[
  {t:'Welcome to STRATA',b:'<strong>STRATA</strong>は4×4×4の4層盤で戦う戦略ボードゲームです。Coreを守りながら、敵Coreの捕獲や包囲を目指します。'},
  {t:'Layer System',b:'戦場は第1層から第4層まであります。すべての層が同時に表示されるので、盤面全体を見ながら手を選べます。'},
  {t:'Your Objective',b:'勝利条件は4つです。<br>・敵Coreを捕獲する<br>・チェックされた敵Coreの逃げ場をすべて塞ぐ（包囲勝ち）<br>・敵軍を完全封鎖する（封鎖勝ち）<br>・チェックメイトする'},
  {t:'Piece Types',b:'駒は5種類です。<br>★ Core / ● Soldier / ┃ Lancer / ◇ Dia / ✚ Ranger<br>Rangerは軸方向へ1マス進み、さらに同じ軸方向を含む空間対角方向へ1マス進む跳躍駒です。'},
  {t:'Captured Pieces',b:'通常駒を捕獲すると持ち駒になります。持ち駒は後から再投入できます。青は第2層、赤は第3層に打てます。'},
  {t:'Ready',b:'駒をタップし、光ったマスをタップして移動します。Coreを守り、敵Coreを包囲しましょう。'}
];
let guideIndex=0;
function hideTitle(){const t=document.getElementById('titleScreen');if(t)t.classList.add('is-hidden');}
function showTitle(){const t=document.getElementById('titleScreen');if(t)t.classList.remove('is-hidden');}
function startMenuGame(mode){hideTitle();const sel=document.getElementById('modeSelect');if(sel)sel.value=mode;gameMode=mode;clearSavedGame();resetGame();}
function continueSavedGame(){hideTitle();draw();scheduleAiIfNeeded();}
function openRulesFromTitle(){hideTitle();scrollToRules();}
function openGuide(i=0){guideIndex=i;renderGuide();const g=document.getElementById('guideScreen');if(g)g.classList.remove('is-hidden');}
function closeGuide(){const g=document.getElementById('guideScreen');if(g)g.classList.add('is-hidden');}
function renderGuide(){const page=guidePages[guideIndex];document.getElementById('guideTitle').textContent=page.t;document.getElementById('guideBody').innerHTML=page.b;document.getElementById('guideNextBtn').textContent=guideIndex===guidePages.length-1?'START GAME':'NEXT';document.getElementById('guideDots').textContent=guidePages.map((_,i)=>i===guideIndex?'●':'○').join(' ');}
function guideNext(){if(guideIndex<guidePages.length-1){guideIndex++;renderGuide();return;}closeGuide();startMenuGame('ai');}
function guideBack(){if(guideIndex>0){guideIndex--;renderGuide();return;}closeGuide();}

initState();loadSavedGame();recordPosition();updateStatsPanel();draw();scheduleAiIfNeeded();
