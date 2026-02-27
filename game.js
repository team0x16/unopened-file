const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let W,H;
function resize(){
  W=canvas.width=innerWidth;
  H=canvas.height=innerHeight;
}
resize();
addEventListener("resize",resize);

// ============================
// CORE
// ============================

class Entity{
  constructor(wx,wy){
    this.wx=wx;
    this.wy=wy;
    this.alive=true;
  }
  update(dt){}
  render(){}
}

// ============================
// PLAYER
// ============================

class Player extends Entity{
  constructor(wx,wy){
    super(wx,wy);
    this.hp=5;
    this.maxHp=5;
    this.stamina=100;
    this.combo=0;
    this.comboTimer=0;
    this.inv=0;
    this.dashCd=0;
    this.vx=0;
    this.vy=0;
  }

  attack(){
    if(this.comboTimer<=0) this.combo=0;
    this.combo++;
    if(this.combo>3) this.combo=1;
    this.comboTimer=30;
  }

  dash(){
    if(this.stamina<30||this.dashCd>0) return;
    this.stamina-=30;
    this.inv=20;
    this.dashCd=40;
    this.wx+=this.vx*2;
    this.wy+=this.vy*2;
    cam.shake=10;
  }

  hurt(){
    if(this.inv>0) return;
    this.hp--;
    this.inv=40;
    cam.shake=20;
    if(this.hp<=0) resetGame();
  }

  update(dt){
    if(this.inv>0)this.inv--;
    if(this.comboTimer>0)this.comboTimer--;
    if(this.dashCd>0)this.dashCd--;

    this.stamina+=0.4;
    if(this.stamina>100)this.stamina=100;

    this.wx+=this.vx*dt;
    this.wy+=this.vy*dt;
  }

  render(){
    const x=W/2;
    const y=H/2;

    ctx.save();
    if(this.inv%6<3) ctx.globalAlpha=0.6;

    ctx.fillStyle="#14141f";
    ctx.beginPath();
    ctx.arc(x,y,18,0,Math.PI*2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================
// ENEMY
// ============================

class Enemy extends Entity{
  constructor(wx,wy){
    super(wx,wy);
    this.hp=3;
    this.state="idle";
  }

  update(dt){
    const dx=player.wx-this.wx;
    const dy=player.wy-this.wy;
    const dist=Math.hypot(dx,dy);

    if(dist<6){
      this.wx+=dx/dist*dt*1.2;
      this.wy+=dy/dist*dt*1.2;
    }

    if(dist<1) player.hurt();
  }

  render(){
    const x=W/2+(this.wx-player.wx)*40;
    const y=H/2+(this.wy-player.wy)*40;

    ctx.fillStyle="#401020";
    ctx.beginPath();
    ctx.arc(x,y,14,0,Math.PI*2);
    ctx.fill();
  }
}

// ============================
// BOSS
// ============================

class Boss extends Enemy{
  constructor(wx,wy){
    super(wx,wy);
    this.hp=20;
    this.phase=1;
    this.timer=0;
  }

  update(dt){
    this.timer+=dt;

    if(this.hp<14) this.phase=2;
    if(this.hp<7) this.phase=3;

    if(this.phase===1){
      super.update(dt);
    }

    if(this.phase===2){
      if(this.timer>100){
        this.wx=player.wx+(Math.random()-0.5)*4;
        this.wy=player.wy+(Math.random()-0.5)*4;
        this.timer=0;
      }
    }

    if(this.phase===3){
      const dx=player.wx-this.wx;
      const dy=player.wy-this.wy;
      const dist=Math.hypot(dx,dy);
      this.wx+=dx/dist*dt*2;
      this.wy+=dy/dist*dt*2;
    }

    if(this.hp<=0){
      saveGame(true);
      enemies=[];
    }
  }

  render(){
    const x=W/2+(this.wx-player.wx)*40;
    const y=H/2+(this.wy-player.wy)*40;

    ctx.fillStyle="#802040";
    ctx.beginPath();
    ctx.arc(x,y,28,0,Math.PI*2);
    ctx.fill();
  }
}

// ============================
// WORLD
// ============================

let player=new Player(0,0);
let enemies=[new Enemy(4,3),new Enemy(-3,-4)];
let boss=null;

// ============================
// CAMERA SHAKE
// ============================

const cam={shake:0};

function applyShake(){
  if(cam.shake>0){
    ctx.translate(
      (Math.random()-0.5)*cam.shake,
      (Math.random()-0.5)*cam.shake
    );
    cam.shake*=0.9;
  }
}

// ============================
// SAVE
// ============================

function saveGame(bossKilled=false){
  localStorage.setItem("uf_save",JSON.stringify({
    px:player.wx,
    py:player.wy,
    hp:player.hp,
    bossKilled
  }));
}

function loadGame(){
  const s=JSON.parse(localStorage.getItem("uf_save"));
  if(!s) return false;
  player.wx=s.px;
  player.wy=s.py;
  player.hp=s.hp;
  if(!s.bossKilled) boss=new Boss(10,0);
  return true;
}

function resetGame(){
  localStorage.removeItem("uf_save");
  location.reload();
}

// ============================
// INPUT
// ============================

addEventListener("keydown",e=>{
  if(e.code==="Space") player.attack();
  if(e.code==="ShiftLeft") player.dash();
  if(e.code==="KeyB") boss=new Boss(10,0);

  if(e.code==="KeyW") player.vy=-2;
  if(e.code==="KeyS") player.vy=2;
  if(e.code==="KeyA") player.vx=-2;
  if(e.code==="KeyD") player.vx=2;
});

addEventListener("keyup",e=>{
  if(["KeyW","KeyS"]) player.vy=0;
  if(["KeyA","KeyD"]) player.vx=0;
});

// ============================
// LOOP
// ============================

let last=0;
function loop(t){
  requestAnimationFrame(loop);
  const dt=(t-last)/16;
  last=t;

  ctx.clearRect(0,0,W,H);

  ctx.save();
  applyShake();

  player.update(dt);
  player.render();

  enemies.forEach(e=>{
    e.update(dt);
    e.render();
  });

  if(boss){
    boss.update(dt);
    boss.render();
  }

  ctx.restore();

  document.getElementById("hp").innerText="hp "+player.hp;
  document.getElementById("stamina").innerText="stamina "+Math.floor(player.stamina);
}

requestAnimationFrame(loop);

// ============================
// MENU
// ============================

document.getElementById("newGame").onclick=()=>{
  document.getElementById("menu").style.display="none";
  boss=new Boss(10,0);
};

document.getElementById("continueGame").onclick=()=>{
  if(loadGame())
    document.getElementById("menu").style.display="none";
};

document.getElementById("resetGame").onclick=resetGame;
