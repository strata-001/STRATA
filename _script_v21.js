
const SIZE=4;
let timeControlSeconds=300;
let clocks={A:timeControlSeconds,B:timeControlSeconds};
let clockTimer=null,lastClockTick=Date.now();
function formatClock(sec){if(!timeControlSeconds)return '∞';sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function startClock(){clearInterval(clockTimer);lastClockTick=Date.now();clockTimer=setInterval(tickClock,1000);}
function isGamePausedUI(){return document.body.classList.contains('title-visible')||['gameMenu','confirmMenu','rulesModal','guideScreen'].some(id=>{const el=document.getElementById(id);return el&&!el.classList.contains('is-hidden');});}
function tickClock(){if(isGamePausedUI()||!timeControlSeconds||winner||drawReason||!clocks||clocks[turn]<=0){lastClockTick=Date.now();return;}const now=Date.now(),delta=Math.max(1,Math.round((now-lastClockTick)/1000));lastClockTick=now;clocks[turn]=Math.max(0,clocks[turn]-delta);if(clocks[turn]<=0){winner=opponent(turn);winReason='timeout';moveHistory.push(`${ownerName(turn)} ran out of time. ${ownerName(winner)} wins on time.`);}draw();}
let CELL_W=78,CELL_H=44,SKEW_X=48;
let LAYER_LAYOUT={4:{ox:210,oy:230,color:'#7dd3fc',fill:'rgba(125,211,252,.055)',name:'Layer 4'},3:{ox:210,oy:425,color:'#67e8f9',fill:'rgba(103,232,249,.050)',name:'Layer 3'},2:{ox:210,oy:620,color:'#38bdf8',fill:'rgba(56,189,248,.055)',name:'Layer 2'},1:{ox:210,oy:815,color:'#0ea5e9',fill:'rgba(14,165,233,.060)',name:'Layer 1'}};
function isMobileBoard(){return window.matchMedia&&window.matchMedia('(max-width:640px)').matches;}
function updateBoardLayout(){
  const svg=document.getElementById('board');
  CELL_W=78; CELL_H=44; SKEW_X=48;
  LAYER_LAYOUT={
    4:{ox:210,oy:230,color:'#7dd3fc',fill:'rgba(125,211,252,.055)',name:'Layer 4'},
    3:{ox:210,oy:425,color:'#67e8f9',fill:'rgba(103,232,249,.050)',name:'Layer 3'},
    2:{ox:210,oy:620,color:'#38bdf8',fill:'rgba(56,189,248,.055)',name:'Layer 2'},
    1:{ox:210,oy:815,color:'#0ea5e9',fill:'rgba(14,165,233,.060)',name:'Layer 1'}
  };
  if(!svg)return;
  if(isMobileBoard() && !document.body.classList.contains('title-visible')){
    const header=document.querySelector('.game-header');
    const captured=document.querySelector('.captured-card');
    const actions=document.querySelector('.mobile-actions');
    const boardWrap=document.querySelector('.board-wrap');
    const vh=window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const headerH=header ? header.getBoundingClientRect().height : 0;
    const capturedH=captured ? captured.getBoundingClientRect().height : 0;
    const actionsH=actions ? actions.getBoundingClientRect().height : 0;
    const chromeGap=18;
    const available=Math.max(360, Math.floor(vh - headerH - capturedH - actionsH - chromeGap));
    if(boardWrap){
      boardWrap.style.height=available+'px';
      boardWrap.style.minHeight='0';
    }
    svg.style.width='100%';
    svg.style.height='100%';
    svg.style.maxWidth='100%';
    svg.style.display='block';
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');

    // Original board geometry bounds, with margin for piece glow and labels.
    const content={x:170,y:28,w:590,h:835};
    const bw=boardWrap ? boardWrap.clientWidth : document.documentElement.clientWidth;
    const bh=available;
    const targetAspect=bw/bh;
    const contentAspect=content.w/content.h;
    let x=content.x,y=content.y,w=content.w,h=content.h;
    if(targetAspect>contentAspect){
      w=h*targetAspect;
      x=content.x+(content.w-w)/2;
    }else{
      h=w/targetAspect;
      y=content.y+(content.h-h)/2;
    }
    // Keep the crop inside the original artboard so the background card remains stable.
    x=Math.max(0, x); y=Math.max(0, y);
    if(x+w>980) x=980-w;
    if(y+h>1040) y=1040-h;
    svg.setAttribute('viewBox',`${Math.round(x)} ${Math.round(y)} ${Math.round(w)} ${Math.round(h)}`);
  }else{
    const boardWrap=document.querySelector('.board-wrap');
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('viewBox','0 0 980 1040');
    svg.style.width='100%';
    svg.style.maxWidth='';
    if(!document.body.classList.contains('title-visible') && boardWrap){
      const header=document.querySelector('.game-header');
      const vh=window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const headerH=header ? header.getBoundingClientRect().height : 0;
      const main=document.querySelector('main');
      const mainStyle=main ? getComputedStyle(main) : null;
      const padY=mainStyle ? parseFloat(mainStyle.paddingTop)+parseFloat(mainStyle.paddingBottom) : 26;
      const available=Math.max(480, Math.floor(vh - headerH - padY - 2));
      boardWrap.style.height=available+'px';
      boardWrap.style.minHeight='0';
      svg.style.height='100%';
    }else if(boardWrap){
      boardWrap.style.height='';
      boardWrap.style.minHeight='';
      svg.style.height='980px';
    }else{
      svg.style.height='980px';
    }
  }
}
window.addEventListener('resize',()=>{clearTimeout(window.__strataResizeTimer);window.__strataResizeTimer=setTimeout(()=>{if(typeof draw==='function')draw();},120);});
const labels={C:'Core',S:'Soldier',L:'Lancer',D:'Dia',R:'Ranger'};
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
function ownerName(o){return o==='A'?'Blue':'Red';}function opponent(o){return o==='A'?'B':'A';}function clonePieces(list){return list.map(p=>({...p}));}function key(x,y,z){return `${x},${y},${z}`;}function coord(p){return `(${p.x},${p.y},${p.z})`;}function inside(x,y,z){return x>=1&&x<=SIZE&&y>=1&&y<=SIZE&&z>=1&&z<=SIZE;}function getPieceAt(x,y,z){return pieces.find(p=>p.x===x&&p.y===y&&p.z===z);}function getCore(o){return pieces.find(p=>p.owner===o&&p.type==='C');}
function blankTypeCounts(){return{C:0,S:0,L:0,D:0,R:0};}
function freshMetrics(){return{checks:{A:0,B:0},captures:{A:0,B:0},coreMoves:{A:0,B:0},moveCounts:{A:blankTypeCounts(),B:blankTypeCounts()},finishTypes:blankTypeCounts(),wallTypes:blankTypeCounts(),firstMove:''};}function freshStats(){return{games:0,blueWins:0,redWins:0,draws:0,mateWins:0,captureWins:0,surroundWins:0,stalemateWins:0,repetitions:0,moveLimit:0,totalMoves:0,minMoves:null,maxMoves:0,blueChecks:0,redChecks:0,blueCaptures:0,redCaptures:0,blueCoreMoves:0,redCoreMoves:0,moveCounts:{A:blankTypeCounts(),B:blankTypeCounts()},finishTypes:blankTypeCounts(),wallTypes:blankTypeCounts(),firstMoves:{}};}
function addCounts(dst,src){for(const t of Object.keys(dst)){dst[t]+=(src[t]||0);}}
function avgTypeText(obj,games){return Object.entries(obj).map(([k,v])=>`${k}:${games?(v/games).toFixed(2):'0.00'}`).join(' / ');}
function topFirstMoves(n=5){const arr=Object.entries(aggregateStats.firstMoves).sort((a,b)=>b[1]-a[1]).slice(0,n);return arr.length?arr.map(([k,v])=>`${k}: ${v}`).join('<br>'):'-';}
function attackersToCore(owner){const c=getCore(owner);if(!c)return[];return pieces.filter(p=>p.owner===opponent(owner)&&attackSquares(p).some(m=>m.x===c.x&&m.y===c.y&&m.z===c.z));}
function adjacentWinnerWalls(loser,winnerOwner){const c=getCore(loser),counts=blankTypeCounts();if(!c)return counts;for(const[dx,dy,dz]of DELTAS_26){const x=c.x+dx,y=c.y+dy,z=c.z+dz;if(!inside(x,y,z))continue;const p=getPieceAt(x,y,z);if(p&&p.owner===winnerOwner&&counts[p.type]!==undefined)counts[p.type]++;}return counts;}
function markFinish(winOwner,loseOwner,fallbackType=''){if(!winOwner||winOwner==='draw'||!loseOwner)return;const attackers=attackersToCore(loseOwner);if(attackers.length){attackers.forEach(p=>{if(currentMetrics.finishTypes[p.type]!==undefined)currentMetrics.finishTypes[p.type]++;});}else if(fallbackType&&currentMetrics.finishTypes[fallbackType]!==undefined){currentMetrics.finishTypes[fallbackType]++;}const walls=adjacentWinnerWalls(loseOwner,winOwner);addCounts(currentMetrics.wallTypes,walls);}
function initState(){pieces=clonePieces(startPieces);turn='A';selectedId=null;winner=null;winReason=null;drawReason=null;moveNumber=1;moveHistory=['Match started'];gameMode=gameMode||'ai';aiLevel=Number(aiLevel||8);aiDelay=Number(aiDelay||350);aiTimer=null;lastAiReason='The AI has not moved yet.';positionCounts=new Map();lastMoveRecord=null;batchRunning=false;batchTargetCount=0;batchCompletedCount=0;gameStatsRecorded=false;gameRecords=[];aggregateStats=freshStats();currentMetrics=freshMetrics();hands={A:[],B:[]};selectedDrop=null;}
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
    if(!target || target.owner!==owner)out.push({x,y,z,capture:!!target,target});
  }
  return out;
}
function isCheckmate(owner){return isInCheck(owner)&&allActionsFor(owner,true).length===0;}
function isCoreSurrounded(owner){
  const c=getCore(owner);
  return !!c && isInCheck(owner) && physicalCoreMoves(owner).length===0;
}
function isStalemate(owner){return !isInCheck(owner)&&allActionsFor(owner,true).length===0;}
function positionKey(){const board=pieces.map(p=>`${p.owner}${p.type}${p.x}${p.y}${p.z}`).sort().join('|');const hA=(hands.A||[]).slice().sort().join('');const hB=(hands.B||[]).slice().sort().join('');return `${turn}:${board}:HA${hA}:HB${hB}`;}function recordPosition(){if(winner||drawReason)return;const k=positionKey();const n=(positionCounts.get(k)||0)+1;positionCounts.set(k,n);if(n>=3){winner='draw';winReason='repetition';drawReason='Threefold repetition: the same position occurred three times. Draw.';moveHistory.push(drawReason);clearTimeout(aiTimer);}}
function tempPositionKeyForAction(action){const oldP=pieces,oldT=turn,oldH=hands;const temp=clonePieces(pieces);const tempH={A:[...(hands.A||[])],B:[...(hands.B||[])]};pieces=temp;hands=tempH;applySearchAction(action);turn=opponent(actionOwner(action));const k=positionKey();pieces=oldP;hands=oldH;turn=oldT;return k;}
function changeMode(){gameMode=document.getElementById('modeSelect').value;resetGame();}function changeAiLevel(){aiLevel=Number(document.getElementById('aiLevelSelect').value);draw();}function changeSpeed(){aiDelay=Number(document.getElementById('speedSelect').value);draw();}
function resetGame(opts={}){clearTimeout(aiTimer);pieces=clonePieces(startPieces);turn='A';selectedId=null;winner=null;winReason=null;drawReason=null;moveNumber=1;moveHistory=['Match started'];lastAiReason='The AI has not moved yet.';positionCounts=new Map();lastMoveRecord=null;gameStatsRecorded=false;currentMetrics=freshMetrics();hands={A:[],B:[]};selectedDrop=null;clocks={A:timeControlSeconds,B:timeControlSeconds};lastClockTick=Date.now();recordPosition();if(!opts.silent){draw();scheduleAiIfNeeded();}}
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
  if(moveNumber===1&&!currentMetrics.firstMove){currentMetrics.firstMove=`Drop ${type} (${x},${y},${z})`;}
  moveHistory.push(`${moveNumber}. ${ownerName(owner)}${isAi?'AI':''} Drop ${shapes[type]}${type} → (${x},${y},${z})${isInCheck(opponent(owner))?'+':''}`);
  moveNumber++; selectedDrop=null; selectedId=null; lastMoveRecord=null; if(reason)lastAiReason=reason;
  turn=opponent(turn);
  if(isCoreSurrounded(turn)){winner=opponent(turn);winReason='surround';markFinish(winner,turn,type);moveHistory.push(`${ownerName(turn)} Core has been surrounded. ${ownerName(winner)} wins by encirclement.`);}else if(isCheckmate(turn)){winner=opponent(turn);winReason='mate';markFinish(winner,turn,type);}else if(isStalemate(turn)){winner=opponent(turn);winReason='stalemate';moveHistory.push(`${ownerName(turn)} has been completely blocked. ${ownerName(winner)} wins by blockade.`);}else recordPosition();
  if(isInCheck(turn))currentMetrics.checks[opponent(turn)]++;
  if(!batchRunning){draw();scheduleAiIfNeeded();}
}

function selectPiece(id){if(winner||drawReason||gameMode==='aivai'||(gameMode==='ai'&&turn===AI_OWNER))return;const p=pieces.find(q=>q.id===id);if(!p||p.owner!==turn)return;selectedDrop=null;selectedId=id;draw();}
function moveSelectedTo(x,y,z){if(winner||drawReason||!selectedId)return;const p=pieces.find(q=>q.id===selectedId);const m=legalMoves(p).find(q=>q.x===x&&q.y===y&&q.z===z);if(!m)return;executeMove(p,m,false,'');}
function executeMove(moving,move,isAi,reason){const from={x:moving.x,y:moving.y,z:moving.z};const target=getPieceAt(move.x,move.y,move.z);if(target&&canCapture(moving,target)){currentMetrics.captures[moving.owner]++;if(target.type==='C'){winner=moving.owner;winReason='capture';markFinish(moving.owner,target.owner,moving.type);}else{hands[moving.owner].push(target.type);}pieces=pieces.filter(p=>p.id!==target.id);}if(currentMetrics.moveCounts[moving.owner]&&currentMetrics.moveCounts[moving.owner][moving.type]!==undefined)currentMetrics.moveCounts[moving.owner][moving.type]++;if(moveNumber===1&&!currentMetrics.firstMove){currentMetrics.firstMove=`${moving.type} ${coord(from)}→${coord(move)}`;}moving.x=move.x;moving.y=move.y;moving.z=move.z;if(moving.type==='C')currentMetrics.coreMoves[moving.owner]++;addMoveLog(moving.owner,moving,from,move,target,isAi,reason);selectedId=null;if(winner){draw();return;}turn=opponent(turn);if(isCoreSurrounded(turn)){winner=opponent(turn);winReason='surround';markFinish(winner,turn,moving.type);moveHistory.push(`${ownerName(turn)} Core has been surrounded. ${ownerName(winner)} wins by encirclement.`);}else if(isCheckmate(turn)){winner=opponent(turn);winReason='mate';markFinish(winner,turn,moving.type);}else if(isStalemate(turn)){winner=opponent(turn);winReason='stalemate';moveHistory.push(`${ownerName(turn)} has been completely blocked. ${ownerName(winner)} wins by blockade.`);}else recordPosition();if(isInCheck(turn))currentMetrics.checks[opponent(turn)]++;if(!batchRunning){draw();scheduleAiIfNeeded();}}
function addMoveLog(owner,piece,from,to,target,isAi,reason){const cap=(target&&canCapture(piece,target))?` × ${ownerName(target.owner)}${shapes[target.type]}${target.type}`:'';const check=target&&target.type==='C'?'#':(isInCheck(opponent(owner))?'+':'');moveHistory.push(`${moveNumber}. ${ownerName(owner)}${isAi?'AI':''} ${shapes[piece.type]}${piece.type} ${coord(from)} → ${coord(to)}${cap}${check}`);moveNumber++;lastMoveRecord={pieceId:piece.id,owner,from:{...from},to:{x:to.x,y:to.y,z:to.z}};if(reason)lastAiReason=reason;}
function distanceToCore(owner,x,y,z){const c=getCore(owner);return c?Math.max(Math.abs(x-c.x),Math.abs(y-c.y),Math.abs(z-c.z)):0;}
function scoreAction(action){if(aiLevel===1)return{score:Math.random()*100,lines:['Random']};if(action.drop){const own=action.owner,opp=opponent(own),move=action.move||action;let score=15+pieceValue[action.type]*2+Math.random()*3;const lines=[`Captured piece ${action.type} to Layer ${dropLayer(own)}`];const check=withTemporaryAction(action,()=>isInCheck(opp));if(check){score+=70;lines.push('DropCheck +70');}const exits=withTemporaryAction(action,()=>physicalCoreMoves(opp).length);score+=(6-exits)*(aiLevel>=4?8:4);lines.push(`enemyCorephysical escape squares ${exits}`);return{score,lines};}const{piece,move,target}=action;const own=piece.owner,opp=opponent(own);const lines=[];let score=Math.random()*3;if(target&&target.type==='C')return{score:100000,lines:['Core Capture +100000']};const before=distanceToCore(opp,piece.x,piece.y,piece.z),after=distanceToCore(opp,move.x,move.y,move.z);const approach=(before-after)*(aiLevel>=3?18:10);score+=approach;lines.push(`enemyCoreapproach ${before}→${after} ${approach>=0?'+':''}${approach.toFixed(1)}`);const center=6-(Math.abs(move.x-2.5)+Math.abs(move.y-2.5)+Math.abs(move.z-2.5));score+=center*(aiLevel>=3?3:1.5);const check=withTemporaryAction(action,()=>isInCheck(opp));const surround=withTemporaryAction(action,()=>isCoreSurrounded(opp)?50000:0);score+=surround;if(surround)lines.push('Encirclement +50000');if(check){score+=70;lines.push('Check +70');}const exits=withTemporaryAction(action,()=>physicalCoreMoves(opp).length);score+=(6-exits)*(aiLevel>=4?10:6);lines.push(`enemyCorephysical escape squares ${exits}`);if(aiLevel>=3){const seen=positionCounts.get(tempPositionKeyForAction(action))||0;if(seen===1){score-=200;lines.push('Avoid repetition -200');}if(seen>=2){score-=5000;lines.push('Avoid threefold repetition -5000');}}if(aiLevel>=4&&lastMoveRecord&&lastMoveRecord.pieceId===piece.id&&lastMoveRecord.from.x===move.x&&lastMoveRecord.from.y===move.y&&lastMoveRecord.from.z===move.z){score-=300;lines.push('Immediate return -300');}return{score,lines};}
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
    fallback.lines.unshift('Search limit reached; falling back to quick score');
    return fallback;
  }
  const base=scoreAction(best);
  base.score=bestScore;
  base.lines.unshift(`${depth}ply search / width${cfg.width} / searched${searchNodes}positions${searchAborted?' / limit reached':''}`);
  return{action:best,score:bestScore,lines:base.lines};
}
function makeAiMove(){if(winner||drawReason||gameMode==='human')return;const side=gameMode==='aivai'?turn:AI_OWNER;if(gameMode==='ai'&&turn!==AI_OWNER)return;if(isCoreSurrounded(side)){winner=opponent(side);winReason='surround';if(!batchRunning)draw();return;}const actions=allActionsFor(side,true);if(!actions.length){winner=opponent(side);winReason=isInCheck(side)?'mate':'stalemate';if(winReason==='stalemate')moveHistory.push(`${ownerName(side)} has been completely blocked. ${ownerName(winner)} wins by blockade.`);if(!batchRunning)draw();return;}const best=aiLevel>=6?chooseDeepAction(side):actions.map(a=>({action:a,...scoreAction(a)})).sort((a,b)=>b.score-a.score)[0];if(best.action.drop){const reason=`${ownerName(side)}AI：Drop ${shapes[best.action.type]}${best.action.type} → (${best.action.move.x},${best.action.move.y},${best.action.move.z})\nScore：${best.score.toFixed(1)}\n・${best.lines.join('\n・')}`;executeDrop(side,best.action.type,best.action.move.x,best.action.move.y,best.action.move.z,true,reason);return;}const moving=pieces.find(p=>p.id===best.action.pieceId);const reason=`${ownerName(side)}AI：${shapes[moving.type]}${moving.type} ${coord(moving)} → ${coord(best.action.move)}\nScore：${best.score.toFixed(1)}\n・${best.lines.join('\n・')}`;executeMove(moving,best.action.move,true,reason);}
function reasonLabel(reason){return reason==='capture'?'Core Capture':reason==='mate'?'Checkmate':reason==='surround'?'Encirclement':reason==='stalemate'?'Blockade':reason==='repetition'?'Threefold Repetition':reason==='move_limit'?'Move Limit':(reason||'');}
function recordCompletedGame(){if(gameStatsRecorded||(!winner&&!drawReason))return;gameStatsRecorded=true;const moves=Math.max(0,moveNumber-1);aggregateStats.games++;if(winner==='A')aggregateStats.blueWins++;else if(winner==='B')aggregateStats.redWins++;else aggregateStats.draws++;if(winReason==='mate')aggregateStats.mateWins++;else if(winReason==='capture')aggregateStats.captureWins++;else if(winReason==='surround')aggregateStats.surroundWins++;else if(winReason==='stalemate')aggregateStats.stalemateWins++;else if(winReason==='repetition')aggregateStats.repetitions++;else if(winReason==='move_limit')aggregateStats.moveLimit++;aggregateStats.totalMoves+=moves;aggregateStats.minMoves=aggregateStats.minMoves===null?moves:Math.min(aggregateStats.minMoves,moves);aggregateStats.maxMoves=Math.max(aggregateStats.maxMoves,moves);aggregateStats.blueChecks+=currentMetrics.checks.A;aggregateStats.redChecks+=currentMetrics.checks.B;aggregateStats.blueCaptures+=currentMetrics.captures.A;aggregateStats.redCaptures+=currentMetrics.captures.B;aggregateStats.blueCoreMoves+=currentMetrics.coreMoves.A;aggregateStats.redCoreMoves+=currentMetrics.coreMoves.B;addCounts(aggregateStats.moveCounts.A,currentMetrics.moveCounts.A);addCounts(aggregateStats.moveCounts.B,currentMetrics.moveCounts.B);addCounts(aggregateStats.finishTypes,currentMetrics.finishTypes);addCounts(aggregateStats.wallTypes,currentMetrics.wallTypes);if(currentMetrics.firstMove)aggregateStats.firstMoves[currentMetrics.firstMove]=(aggregateStats.firstMoves[currentMetrics.firstMove]||0)+1;gameRecords.push({game:aggregateStats.games,winner:winner==='A'?'Blue':winner==='B'?'Red':'Draw',reason:reasonLabel(winReason)||drawReason||'',moves,blueChecks:currentMetrics.checks.A,redChecks:currentMetrics.checks.B,blueCaptures:currentMetrics.captures.A,redCaptures:currentMetrics.captures.B,blueCoreMoves:currentMetrics.coreMoves.A,redCoreMoves:currentMetrics.coreMoves.B,bluePieces:pieces.filter(p=>p.owner==='A').length,redPieces:pieces.filter(p=>p.owner==='B').length,blueMoveC:currentMetrics.moveCounts.A.C,blueMoveS:currentMetrics.moveCounts.A.S,blueMoveL:currentMetrics.moveCounts.A.L,blueMoveD:currentMetrics.moveCounts.A.D,blueMoveR:currentMetrics.moveCounts.A.R,redMoveC:currentMetrics.moveCounts.B.C,redMoveS:currentMetrics.moveCounts.B.S,redMoveL:currentMetrics.moveCounts.B.L,redMoveD:currentMetrics.moveCounts.B.D,redMoveR:currentMetrics.moveCounts.B.R,finishC:currentMetrics.finishTypes.C,finishS:currentMetrics.finishTypes.S,finishL:currentMetrics.finishTypes.L,finishD:currentMetrics.finishTypes.D,finishR:currentMetrics.finishTypes.R,wallC:currentMetrics.wallTypes.C,wallS:currentMetrics.wallTypes.S,wallL:currentMetrics.wallTypes.L,wallD:currentMetrics.wallTypes.D,wallR:currentMetrics.wallTypes.R,firstMove:currentMetrics.firstMove});updateStatsPanel();}
function avg(n,d){return d?(n/d).toFixed(2):'0.00'}function pct(n,d){return d?`${(n/d*100).toFixed(1)}%`:'0.0%'}function updateStatsPanel(){const s=aggregateStats,el=document.getElementById('statsPanel');if(!s.games){el.textContent=batchRunning?`Running ${batchCompletedCount}/${batchTargetCount}`:'No statistics yet.';return;}el.innerHTML=`Games ${s.games}<br>Bluewins ${s.blueWins} (${pct(s.blueWins,s.games)}) / Redwins ${s.redWins} (${pct(s.redWins,s.games)}) / Draw ${s.draws}<br>Average moves ${avg(s.totalMoves,s.games)} / Shortest ${s.minMoves} / Longest ${s.maxMoves}<br>Core Capture ${s.captureWins} / Checkmate ${s.mateWins} / Encirclement ${s.surroundWins} / Blockade ${s.stalemateWins} / threefold ${s.repetitions} / Move Limit ${s.moveLimit}<br>Average checks Blue${avg(s.blueChecks,s.games)} Red${avg(s.redChecks,s.games)}<br>Average Core moves Blue${avg(s.blueCoreMoves,s.games)} Red${avg(s.redCoreMoves,s.games)}<br><br><b>Average moves by piece</b><br>Blue：${avgTypeText(s.moveCounts.A,s.games)}<br>Red：${avgTypeText(s.moveCounts.B,s.games)}<br><br><b>Checking piece at finish</b><br>${avgTypeText(s.finishTypes,s.games)}<br><br><b>Wall contribution at finish</b><br>${avgTypeText(s.wallTypes,s.games)}<br><br><b>Opening move distribution Top5</b><br>${topFirstMoves(5)}`;}
function resetStats(){aggregateStats=freshStats();gameRecords=[];updateStatsPanel();}function runBatchGames(count){clearTimeout(aiTimer);if(batchRunning)return;const prev=gameMode;gameMode='aivai';batchRunning=true;batchTargetCount=count;batchCompletedCount=0;updateStatsPanel();function play(){resetGame({silent:true});let guard=0;while(!winner&&!drawReason&&guard<200){makeAiMove();guard++;}if(!winner&&!drawReason){winner='draw';winReason='move_limit';drawReason='200-move limit';}recordCompletedGame();batchCompletedCount++;}function step(){let n=0;while(batchCompletedCount<count&&n<(aiLevel>=8?1:3)){play();n++;}updateStatsPanel();if(batchCompletedCount<count)setTimeout(step,0);else{batchRunning=false;gameMode=prev;resetGame({silent:true});draw();scheduleAiIfNeeded();}}setTimeout(step,0);}function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}function downloadStatsCsv(){if(!gameRecords.length){alert('No statistics.');return;}const h=Object.keys(gameRecords[0]);const rows=[h.join(',')].concat(gameRecords.map(r=>h.map(k=>csvEscape(r[k])).join(',')));const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`strata_mini_core_only_stats_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

function drawHands(){
  const el=document.getElementById('handsBox'); if(!el)return;
  const order=['L','D','R','S'];
  function pieceButton(owner,type,idx){
    const sel=selectedDrop&&selectedDrop.owner===owner&&selectedDrop.type===type?' sel':'';
    return `<button type="button" class="handpiece${sel}" onclick="selectDrop('${owner}','${type}')" title="Drop ${labels[type]} on Layer ${dropLayer(owner)}" aria-label="Drop ${labels[type]}">${shapes[type]}</button>`;
  }
  function side(owner){
    const cls=owner==='A'?'blue':'red';
    const list=[...(hands[owner]||[])].filter(t=>order.includes(t)).sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    let html=`<div class="hand-row piece-stand ${owner==='A'?'blue-stand':'red-stand'}"><div class="hand-title"><b class="${cls}">${ownerName(owner)}</b><span class="note">Drop L${dropLayer(owner)}</span></div><div class="hand-counts" aria-label="${ownerName(owner)} piece stand">`;
    if(list.length){ list.forEach((t,i)=>{ html+=pieceButton(owner,t,i); }); }
    else{ html+=`<span class="piece-stand-empty">No captured pieces</span>`; }
    return html+'</div></div>';
  }
  el.innerHTML=side('A')+side('B');
}

function evaluateSide(owner){const material=pieces.filter(p=>p.owner===owner).reduce((s,p)=>s+pieceValue[p.type],0)+(hands[owner]||[]).reduce((s,t)=>s+pieceValue[t]*0.8,0);const mobility=allActionsFor(owner,true).length;const check=isInCheck(owner);return{material,mobility,check,score:material+mobility*.3-(check?50:0)}}function drawEvaluation(){const a=evaluateSide('A'),b=evaluateSide('B');document.getElementById('evalBox').innerHTML=`<div class="evalcard"><b class="blue">Blue</b><br>Score:${a.score.toFixed(1)}<br>Material:${a.material}<br>Legal moves:${a.mobility}<br>${a.check?'Check':'Safe'}</div><div class="evalcard"><b class="red">Red</b><br>Score:${b.score.toFixed(1)}<br>Material:${b.material}<br>Legal moves:${b.mobility}<br>${b.check?'Check':'Safe'}</div>`;}
function project(x,y,z){const l=LAYER_LAYOUT[z];return{sx:l.ox+(x-1)*CELL_W+(y-1)*SKEW_X,sy:l.oy-(y-1)*CELL_H};}function cellCenter(x,y,z){const p=project(x,y,z);return{sx:p.sx+CELL_W*.5,sy:p.sy-CELL_H*.5};}function pathForCell(x,y,z){const p=project(x,y,z),a={x:p.sx,y:p.sy},b={x:p.sx+CELL_W,y:p.sy},c={x:p.sx+CELL_W+SKEW_X,y:p.sy-CELL_H},d={x:p.sx+SKEW_X,y:p.sy-CELL_H};return`M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y} L${d.x},${d.y} Z`;}function svgEl(n,a={}){const e=document.createElementNS('http://www.w3.org/2000/svg',n);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);return e;}function addText(svg,t,x,y,a={}){const e=svgEl('text',{x,y,...a});e.textContent=t;svg.appendChild(e);return e;}
function attackedMap(owner){const set=new Set();pieces.filter(p=>p.owner===owner).forEach(p=>attackSquares(p).forEach(m=>set.add(key(m.x,m.y,m.z))));return set;}
function drawLayer(svg,z,moveMap,attA,attB){
  const l=LAYER_LAYOUT[z];
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

function updateGamePanel(){
  const p=document.getElementById('turnPanel');
  if(p){p.className=`turn-pill ${turn==='A'?'blue':'red'}`;p.innerHTML=`<span class="turn-dot"></span><span>${ownerName(turn)} to move</span>`;}
  const h=document.getElementById('dropHint');
  if(h){if(selectedDrop){h.style.display='block';h.textContent=`Drop ${shapes[selectedDrop.type]}${selectedDrop.type} → Layer ${dropLayer(selectedDrop.owner)}`;}else{h.style.display='none';}}
}
function updateClockUI(){
  const a=document.getElementById('timeA'),b=document.getElementById('timeB'),ca=document.getElementById('clockA'),cb=document.getElementById('clockB');
  const sa=document.getElementById('sideTimeA'),sb=document.getElementById('sideTimeB'),sca=document.getElementById('sideClockA'),scb=document.getElementById('sideClockB');
  const ta=formatClock(clocks.A),tb=formatClock(clocks.B);
  if(a)a.textContent=ta; if(b)b.textContent=tb; if(sa)sa.textContent=ta; if(sb)sb.textContent=tb;
  if(ca)ca.classList.toggle('clock-active',turn==='A'&&!winner&&!drawReason); if(cb)cb.classList.toggle('clock-active',turn==='B'&&!winner&&!drawReason);
  if(sca)sca.classList.toggle('active',turn==='A'&&!winner&&!drawReason); if(scb)scb.classList.toggle('active',turn==='B'&&!winner&&!drawReason);
}
function toggleHelpPanel(){document.body.classList.toggle('help-open');}
function draw(){
  updateBoardLayout();
  const svg=document.getElementById('board');svg.innerHTML='';
  const defs=svgEl('defs');
  const glow=svgEl('filter',{id:'softGlow',x:'-30%',y:'-30%',width:'160%',height:'160%'}); glow.appendChild(svgEl('feDropShadow',{dx:0,dy:0,stdDeviation:5,'flood-color':'#38bdf8','flood-opacity':.35})); defs.appendChild(glow);
  const pieceGlow=svgEl('filter',{id:'pieceGlow',x:'-40%',y:'-40%',width:'180%',height:'180%'}); pieceGlow.appendChild(svgEl('feDropShadow',{dx:0,dy:0,stdDeviation:4,'flood-color':'#ffffff','flood-opacity':.30})); defs.appendChild(pieceGlow); svg.appendChild(defs);
  svg.appendChild(svgEl('rect',{x:0,y:0,width:980,height:1040,fill:'#020817'}));
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
  const legacyTurnLabel=document.getElementById('turnLabel');if(legacyTurnLabel){legacyTurnLabel.textContent=ownerName(turn);legacyTurnLabel.className=turn==='A'?'blue':'red';}updateGamePanel();updateClockUI();document.getElementById('modeHelp').textContent=(gameMode==='human'?'Human vs Human':(gameMode==='aivai'?'AI vs AI':'Human vs AI'))+' · '+(timeControlSeconds?formatClock(timeControlSeconds):'Unlimited')+(gameMode==='human'?'':` · ${['','Random','Easy','Easy','Normal','Normal','Hard','Hard','Hard','Very Hard','Very Hard'][aiLevel]||'AI'}`);if(winner||drawReason)recordCompletedGame();const cb=document.getElementById('checkBox');if(!winner&&isInCheck(turn)){cb.style.display='block';cb.textContent=`${ownerName(turn)} Core is in check.`;}else cb.style.display='none';const wb=document.getElementById('winnerBox');if(winner){wb.style.display='block';wb.textContent=winner==='draw'?(drawReason||'Draw'):(winReason==='timeout'?`${ownerName(winner)} wins on time.`:(winReason==='surround'?`${ownerName(winner)} wins by encirclement.`:(winReason==='mate'?`${ownerName(winner)} wins by checkmate.`:(winReason==='stalemate'?`${ownerName(winner)} wins by blockade.`:`${ownerName(winner)} wins by Core capture.`))));}else wb.style.display='none';document.getElementById('moveLog').textContent=moveHistory.join('\n');document.getElementById('aiReason').textContent=lastAiReason;drawHands();drawEvaluation();updateStatsPanel();}


const STORAGE_KEY='strata-save-v3';
let deferredInstallPrompt=null;
function snapshotGame(){return{pieces,turn,winner,winReason,drawReason,moveNumber,moveHistory,gameMode,aiLevel,aiDelay,timeControlSeconds,lastAiReason,lastMoveRecord,hands,currentMetrics,clocks,positionCounts:[...positionCounts.entries()]};}
function saveGame(){try{if(pieces&&hands)localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshotGame()));}catch(e){}}
function loadSavedGame(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;const s=JSON.parse(raw);if(!s||!Array.isArray(s.pieces))return false;pieces=s.pieces;turn=s.turn||'A';winner=s.winner||null;winReason=s.winReason||null;drawReason=s.drawReason||null;moveNumber=s.moveNumber||1;moveHistory=s.moveHistory||['Match started'];gameMode=s.gameMode||gameMode;aiLevel=Number(s.aiLevel||aiLevel||3);aiDelay=Number(s.aiDelay||aiDelay||350);lastAiReason=s.lastAiReason||lastAiReason;lastMoveRecord=s.lastMoveRecord||null;hands=s.hands||{A:[],B:[]};timeControlSeconds=Number(s.timeControlSeconds??300);clocks=s.clocks||{A:timeControlSeconds,B:timeControlSeconds};currentMetrics=s.currentMetrics||freshMetrics();positionCounts=new Map(s.positionCounts||[]);selectedId=null;selectedDrop=null;return true;}catch(e){return false;}}
function clearSavedGame(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}
function toggleMobileMenu(){document.body.classList.toggle('mobile-menu-open');}
const originalDraw=draw;
draw=function(){originalDraw();const m=document.getElementById('turnLabelMobile');if(m){m.textContent=ownerName(turn);m.className=turn==='A'?'blue':'red';}const mh=document.getElementById('turnLabelHeaderMobile');if(mh){mh.textContent=ownerName(turn);mh.className=turn==='A'?'blue':'red';}saveGame();};
function scrollToRules(){document.body.classList.add('help-open');const target=document.getElementById('rulesCard');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});}
function updateOnlineState(){const pill=document.getElementById('offlinePill');if(pill)pill.classList.toggle('show',!navigator.onLine);}
window.addEventListener('online',updateOnlineState);window.addEventListener('offline',updateOnlineState);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;const b=document.getElementById('installBanner');if(b)b.classList.add('show');});
window.addEventListener('appinstalled',()=>{const b=document.getElementById('installBanner');if(b)b.classList.remove('show');deferredInstallPrompt=null;});
window.addEventListener('load',()=>{updateOnlineState();const btn=document.getElementById('installBtn');if(btn)btn.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;const b=document.getElementById('installBanner');if(b)b.classList.remove('show');});if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);});


const guidePages=[
  {t:'Welcome to STRATA',b:'<strong>STRATA</strong> is a compact 3D abstract strategy game played on a 4×4×4 battlefield. Protect your Core and defeat your opponent through capture, encirclement, blockade, or checkmate.'},
  {t:'Layer System',b:'The battlefield has four layers: Layer 1 through Layer 4. All layers are visible at the same time, so you can read the whole position while choosing your move.'},
  {t:'Your Objective',b:'There are four ways to win:<br>・Capture the enemy Core<br>・Surround a checked enemy Core so it has no escape squares<br>・Completely block the enemy army<br>・Deliver checkmate'},
  {t:'Piece Movement',b:'★ Core and ● Soldier move 1 square along the six axes.<br>┃ Lancer slides any distance along one axis.<br>◇ Dia slides along 3D diagonals.<br>✚ Ranger leaps 1 axis step plus 1 diagonal step. It can jump over intervening pieces.'},
  {t:'Captured Pieces',b:'When you capture a non-Core piece, it becomes one of your captured pieces. You can drop captured pieces back onto the board later. Blue drops on Layer 2; Red drops on Layer 3.'},
  {t:'Ready',b:'Tap a piece, then tap a highlighted square to move. Protect your Core, control the layers, and surround the enemy Core.'}
];
let guideIndex=0;
function hideTitle(){const t=document.getElementById('titleScreen');if(t)t.classList.add('is-hidden');const setup=document.getElementById('setupScreen');if(setup)setup.classList.add('is-hidden');document.body.classList.remove('title-visible');}
function showTitle(){closeGameMenu();closeConfirmMenu();closeRulesModal();const t=document.getElementById('titleScreen');if(t)t.classList.remove('is-hidden');const setup=document.getElementById('setupScreen');if(setup)setup.classList.add('is-hidden');document.body.classList.add('title-visible');}
function openSetup(){const t=document.getElementById('titleScreen');if(t)t.classList.add('is-hidden');const setup=document.getElementById('setupScreen');if(setup)setup.classList.remove('is-hidden');document.body.classList.add('title-visible');}
function backToTitle(){const setup=document.getElementById('setupScreen');if(setup)setup.classList.add('is-hidden');const t=document.getElementById('titleScreen');if(t)t.classList.remove('is-hidden');document.body.classList.add('title-visible');}
function applySetup(mode,secs,level,delay){gameMode=mode;timeControlSeconds=Number(secs);aiLevel=Number(level);aiDelay=Number(delay);clocks={A:timeControlSeconds,B:timeControlSeconds};}
function startSetupGame(){applySetup(document.getElementById('setupMode').value,document.getElementById('setupTime').value,document.getElementById('setupAi').value,document.getElementById('setupSpeed').value);hideTitle();clearSavedGame();resetGame();}
function startMenuGame(mode){applySetup(mode,document.getElementById('setupTime')?.value||300,document.getElementById('setupAi')?.value||3,document.getElementById('setupSpeed')?.value||350);hideTitle();clearSavedGame();resetGame();}
function continueSavedGame(){loadSavedGame();hideTitle();draw();scheduleAiIfNeeded();}
function openGameMenu(){clearTimeout(aiTimer);document.getElementById('gameMenu')?.classList.remove('is-hidden');}
function closeGameMenu(){document.getElementById('gameMenu')?.classList.add('is-hidden');scheduleAiIfNeeded();}
function confirmMainMenu(){closeGameMenu();document.getElementById('confirmMenu')?.classList.remove('is-hidden');}
function closeConfirmMenu(){document.getElementById('confirmMenu')?.classList.add('is-hidden');}
function returnToMainMenu(){saveGame();clearTimeout(aiTimer);showTitle();}
function openSetupFromGame(){clearTimeout(aiTimer);closeGameMenu();openSetup();}
function openRulesModal(){document.getElementById('rulesModal')?.classList.remove('is-hidden');}
function closeRulesModal(){document.getElementById('rulesModal')?.classList.add('is-hidden');}
function openRulesFromTitle(){openRulesModal();}
function openGuide(i=0){guideIndex=i;renderGuide();const g=document.getElementById('guideScreen');if(g)g.classList.remove('is-hidden');}
function closeGuide(){const g=document.getElementById('guideScreen');if(g)g.classList.add('is-hidden');}
function renderGuide(){const page=guidePages[guideIndex];document.getElementById('guideTitle').textContent=page.t;document.getElementById('guideBody').innerHTML=page.b;document.getElementById('guideNextBtn').textContent=guideIndex===guidePages.length-1?'START GAME':'NEXT';document.getElementById('guideDots').textContent=guidePages.map((_,i)=>i===guideIndex?'●':'○').join(' ');}
function guideNext(){if(guideIndex<guidePages.length-1){guideIndex++;renderGuide();return;}closeGuide();openSetup();}
function guideBack(){if(guideIndex>0){guideIndex--;renderGuide();return;}closeGuide();}

initState();loadSavedGame();recordPosition();updateStatsPanel();draw();scheduleAiIfNeeded();startClock();
