// Original diagrams for the ISP article. No screenshots or external images are used.
// Requires Node.js and sharp. Run from any directory with sharp on NODE_PATH.
// All numerical curves are teaching models, not measurements of a HiSilicon AE library.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const out = path.resolve(__dirname, '../../assets/ISP/hisi-ae-histogram');
const C = {
  ink: '#182d43', muted: '#52647a', line: '#cbd5e1', grid: '#e8edf3',
  blue: '#2764aa', blueLight: '#eaf2fc', orange: '#bb7019',
  orangeLight: '#fff3df', teal: '#087f82', darkBin: '#557da8', brightBin: '#e3a64f',
};
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fmt = v => Number(v.toFixed(3));

class Figure {
  constructor(height, title, subtitle) {
    this.width = 1120;
    this.height = height;
    this.parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img">`,
      `<title>${esc(title)}</title><desc>${esc(subtitle)}</desc>`,
      '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#52647a" stroke-width="1.5"/></marker></defs>',
      '<rect width="1120" height="100%" fill="#ffffff"/>',
    ];
    this.text(48, 53, title, { size: 32, weight: 600 });
    this.text(48, 91, subtitle, { size: 21, color: C.muted });
  }
  text(x, y, content, opt = {}) {
    const { size = 25, color = C.ink, anchor = 'start', weight = 400, rotate = 0 } = opt;
    const transform = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
    const lines = Array.isArray(content) ? content : [content];
    this.parts.push(`<text x="${x}" y="${y}" fill="${color}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${transform}>${lines.map((s, i) => `<tspan x="${x}" dy="${i ? Math.round(size * 1.5) : 0}">${esc(s)}</tspan>`).join('')}</text>`);
  }
  rect(x, y, w, h, fill, stroke = 'none', radius = 0) {
    this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
  }
  line(x1, y1, x2, y2, color = C.line, width = 2, dash = '', arrow = false) {
    this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow ? ' marker-end="url(#arrow)"' : ''}/>`);
  }
  poly(points, color, width = 4, dash = '') {
    this.parts.push(`<polyline points="${points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
  }
  polygon(points, fill) {
    this.parts.push(`<polygon points="${points.map(p => p.join(',')).join(' ')}" fill="${fill}"/>`);
  }
  ellipse(cx, cy, rx, ry, fill) {
    this.parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`);
  }
  footer(content) {
    this.text(48, this.height - 25, content, { size: 18, color: C.muted });
  }
  finish() { return this.parts.join('\n') + '\n</svg>\n'; }
}

function axes(f, box, xTicks, yTicks, xLabel, yLabel, xMax, yMin, yMax) {
  const X = x => box.x + x / xMax * box.w;
  const Y = y => box.y + box.h - (y - yMin) / (yMax - yMin) * box.h;
  yTicks.forEach(t => {
    f.line(box.x, Y(t), box.x + box.w, Y(t), C.grid, 1.3);
    f.text(box.x - 18, Y(t) + 8, t, { size: 22, anchor: 'end', color: C.muted });
  });
  xTicks.forEach(t => {
    f.line(X(t), box.y + box.h, X(t), box.y + box.h + 7, C.muted, 1.5);
    f.text(X(t), box.y + box.h + 36, t, { size: 22, anchor: 'middle', color: C.muted });
  });
  f.line(box.x, box.y, box.x, box.y + box.h, C.muted, 1.6);
  f.line(box.x, box.y + box.h, box.x + box.w, box.y + box.h, C.muted, 1.6);
  f.text(box.x + box.w / 2, box.y + box.h + 79, xLabel, { size: 23, anchor: 'middle' });
  f.text(box.x - 80, box.y + box.h / 2, yLabel, { size: 23, anchor: 'middle', rotate: -90 });
  return { X, Y };
}

function flow() {
  const f = new Figure(760, 'AE 闭环：统计、评价、决策与执行', '按功能划分的原理图；不表示某一版本固件的内部调用顺序。');
  f.rect(414, 119, 658, 44, C.blueLight, 'none', 6);
  f.text(743, 149, '配置：目标亮度、优先策略、权重与影响上限', { size: 23, anchor: 'middle', color: C.blue });
  const node = (x, y, title, desc, focus = false) => {
    f.rect(x, y, 292, 132, focus ? C.blueLight : '#f4f7fa', focus ? '#a9c5e8' : C.line, 12);
    f.text(x + 146, y + 40, title, { size: 27, anchor: 'middle', weight: 600 });
    f.text(x + 146, y + 79, desc, { size: 22, anchor: 'middle', color: C.muted });
  };
  node(48, 202, '1  采集当前帧', ['场景、传感器与', '当前曝光参数']);
  node(414, 202, '2  读取统计', ['分块均值、全局均值', '直方图等']);
  node(780, 202, '3  评价亮度', ['按策略重视亮处或暗处', '得到测光评价量'], true);
  node(780, 450, '4  计算调整量', ['与亮度目标比较', '加入收敛与约束'], true);
  node(414, 450, '5  曝光分配', ['曝光时间、各级增益', '帧率、抗闪等限制']);
  node(48, 450, '6  参数生效', ['经传感器生效延时', '形成后续帧']);
  [[340,268,403,268], [706,268,769,268], [926,334,926,439],
    [780,516,717,516], [414,516,351,516], [194,450,194,345]].forEach(a => f.line(...a, C.muted, 2.2, '', true));
  f.line(926, 164, 926, 190, C.muted, 1.6, '', true);
  f.text(560, 645, '本文重点：改变曝光判断的取舍，最终影响全局曝光。', { size: 26, anchor: 'middle', color: C.blue });
  f.text(560, 687, '分块参与测光，不等于每个分块都有独立快门。', { size: 23, anchor: 'middle', color: C.muted });
  f.footer('原创原理图 · 同一曝光帧的全局 AE；多帧 WDR 的曝光分配另有约束。');
  return f;
}

function histogram() {
  const f = new Figure(880, '像素没有改变，改变的是它们在测光中的分量', '教学例子：90 个像素亮度为 40，另 10 个像素亮度为 200。');
  const b = { x: 132, y: 150, w: 872, h: 245 };
  const { X, Y } = axes(f, b, [0,64,128,192,255], [0,50,100], '亮度档位 Y（教学用 8 bit）', '实际像素数 N', 255, 0, 100);
  [[40,90,C.darkBin],[200,10,C.brightBin]].forEach(([x,n,color]) => {
    f.rect(X(x)-24, Y(n), 48, Y(0)-Y(n), color);
    f.text(X(x), Y(n)-17, `${n} 个`, { size: 24, anchor: 'middle' });
  });
  f.text(48, 525, '加入权重后，各亮度档在平均值中的份额：', { size: 25, weight: 600 });
  f.rect(755, 505, 20, 20, C.darkBin); f.text(785, 523, '暗档', { size: 21 });
  f.rect(905, 505, 20, 20, C.brightBin); f.text(935, 523, '亮档', { size: 21 });
  const rows = [
    ['普通平均', '权重 1 : 1', 90,10,56],
    ['高光加权', '权重 1 : 9', 90,90,120],
    ['低光加权', '权重 9 : 1', 810,10,34400/820],
  ];
  rows.forEach(([title, weights, dark, bright, mean], i) => {
    const y = 571 + i*88, start = 283, width = 579;
    const share = dark/(dark+bright);
    f.text(48, y+24, title, { size: 25 });
    f.text(48, y+54, weights, { size: 20, color: C.muted });
    f.rect(start, y, width*share, 41, C.darkBin);
    f.rect(start+width*share, y, width*(1-share), 41, C.brightBin);
    f.text(start+10, y+69, `有效份数 ${dark} : ${bright}`, { size: 20, color: C.muted });
    f.text(1060, y+30, `均值 ${Number.isInteger(mean) ? mean : mean.toFixed(2)}`, { size: 28, anchor: 'end', weight: 600 });
  });
  f.footer('原创教学图 · 下方是加权后的贡献份额，实际像素数仍然是 90 个与 10 个。');
  return f;
}

function globalExposure() {
  const f = new Figure(1130, '同一个曝光变化，会同时影响前景与窗外', '合成场景示意：对线性信号乘曝光倍数，再截断并做固定显示变换。');
  const gray = (v,e) => { const n = Math.round(255*Math.min(1,v*e)**(1/2.2)); return `rgb(${n},${n},${n})`; };
  const panels = [
    [0.5, '较低曝光', ['窗外层次较多', '前景人脸更暗']],
    [1, '中间曝光', ['两端亮度作折中', '未必满足主体需求']],
    [2.5, '较高曝光', ['前景人脸更亮', '窗外部分信号截断']],
  ];
  panels.forEach(([e,title,desc],i) => {
    const x = 66, y = 157+i*292, w = 605, h = 237;
    f.parts.push(`<defs><clipPath id="scene-${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#scene-${i})">`);
    f.rect(x,y,w,h,gray(.035,e));
    f.rect(x,y+h*.76,w,h*.24,gray(.018,e));
    const wx=x+328, wy=y+22;
    f.rect(wx,wy,246,153,gray(.90,e));
    f.polygon([[wx+9,wy+143],[wx+65,wy+42],[wx+129,wy+143]],gray(.60,e));
    f.polygon([[wx+109,wy+143],[wx+173,wy+24],[wx+236,wy+143]],gray(.52,e));
    f.rect(wx-7,wy-7,260,7,gray(.12,e));
    f.rect(wx-7,wy+153,260,7,gray(.12,e));
    f.rect(wx-7,wy-7,7,167,gray(.12,e));
    f.rect(wx+246,wy-7,7,167,gray(.12,e));
    f.rect(wx+120,wy,6,153,gray(.12,e));
    f.ellipse(x+165,y+164,86,81,gray(.016,e));
    f.ellipse(x+165,y+86,43,54,gray(.075,e));
    f.ellipse(x+165,y+41,39,17,gray(.008,e));
    f.ellipse(x+152,y+80,3.6,3.6,gray(.01,e));
    f.ellipse(x+179,y+80,3.6,3.6,gray(.01,e));
    f.line(x+154,y+109,x+178,y+109,gray(.03,e),3);
    f.parts.push('</g>');
    f.text(725,y+54,title,{size:30,weight:600});
    f.text(725,y+106,desc,{size:25,color:C.muted});
    f.text(725,y+203,`曝光倍数 ×${e}`,{size:22,color:C.blue});
  });
  f.text(560,1065,'关注某一区域，并不会让其他区域免受曝光变化的影响。',{size:25,anchor:'middle',color:C.blue});
  f.footer('原创合成示意 · 非相机实拍、非海思输出，也不代表三种 AE 策略必然产生这些倍数。');
  return f;
}

function limits() {
  const f = new Figure(1150, '敏感程度与干预上限，是两个独立维度', '教学模型：Δ = min(kp, Δmax)。k 与 Δmax 不直接对应 SDK 参数数值。');
  const chart = (top,title,curves) => {
    f.text(48,top,title,{size:27,weight:600});
    const b={x:135,y:top+68,w:868,h:280};
    const {X,Y}=axes(f,b,[0,5,10,15,20],[0,8,16,24,32],'高光或暗光占比 p（%）','修正幅度 Δ（示意单位）',20,0,32);
    curves.forEach(({k,cap,color,dash,label},idx)=>{
      const points=Array.from({length:201},(_,i)=>{const p=i/10;return [X(p),Y(Math.min(k*p/100,cap))];});
      f.poly(points,color,4,dash);
      const lx=idx===0?470:760;
      f.line(lx,top+31,lx+38,top+31,color,4,dash);
      f.text(lx+49,top+39,label,{size:21,color:C.muted});
    });
  };
  chart(148,'(a) 相同上限：敏感程度不同',[
    {k:80,cap:16,color:C.blue,label:'k = 80，Δmax = 16'},
    {k:200,cap:16,color:C.orange,dash:'10 6',label:'k = 200，Δmax = 16'},
  ]);
  chart(636,'(b) 相同敏感程度：最大幅度不同',[
    {k:200,cap:8,color:C.blue,label:'k = 200，Δmax = 8'},
    {k:200,cap:24,color:C.orange,dash:'10 6',label:'k = 200，Δmax = 24'},
  ]);
  f.footer('原创教学图 · 高光优先可用目标下调来解释，低光优先可用目标上调来解释；并非内部公式。');
  return f;
}

function dynamics() {
  const f = new Figure(780, '放慢变化，不能消除稳定后的过度偏移', '辅助仿真：物体进入与离开时，用同一个阶跃输入比较上限和一阶平滑。');
  const b={x:138,y:246,w:867,h:356};
  const cases=[
    {cap:8,alpha:.5,color:C.blue,label:'较小上限 8，较快平滑 α = 0.5'},
    {cap:24,alpha:.5,color:C.orange,label:'较大上限 24，较快平滑 α = 0.5'},
    {cap:24,alpha:.12,color:C.teal,label:'较大上限 24，较慢平滑 α = 0.12',dash:'10 6'},
  ];
  cases.forEach((c,i)=>{f.line(67,131+i*36,109,131+i*36,c.color,4,c.dash||'');f.text(126,139+i*36,c.label,{size:22,color:C.muted});});
  const X=x=>b.x+x/100*b.w;
  f.rect(X(20),b.y,X(70)-X(20),b.h,'#f0f3f7');
  const ax=axes(f,b,[0,20,40,60,80,100],[40,48,56,64],'帧序号（教学时间轴）','平滑后的亮度参考量（示意单位）',100,36,68);
  f.text((X(20)+X(70))/2,b.y+26,'亮物体停留区间',{size:21,anchor:'middle',color:C.muted});
  cases.forEach(c=>{
    let value=64;
    const points=[];
    for(let n=0;n<=100;n++){
      const input=(n>=20&&n<70)?32:0;
      const target=64-Math.min(input,c.cap);
      value+=c.alpha*(target-value);
      points.push([ax.X(n),ax.Y(value)]);
    }
    f.poly(points,c.color,4,c.dash||'');
  });
  f.text(560,718,'上限影响能偏多远；平滑影响多久接近该结果。',{size:25,anchor:'middle',color:C.blue});
  f.footer('原创辅助仿真 · 不模拟真实 AE 闭环、sensor 延时或 SDK 步长；α 也不是 speed 的换算值。');
  return f;
}

async function main() {
  fs.mkdirSync(out,{recursive:true});
  const figures=[
    ['01-ae-control-loop',flow()],
    ['02-histogram-weighting',histogram()],
    ['03-global-exposure',globalExposure()],
    ['04-sensitivity-and-cap',limits()],
    ['05-amplitude-and-speed',dynamics()],
  ];
  for(const [name,figure] of figures){
    const svg=figure.finish();
    fs.writeFileSync(path.join(out,`${name}.svg`),svg,'utf8');
    await sharp(Buffer.from(svg),{density:144}).png({compressionLevel:9}).toFile(path.join(out,`${name}.png`));
    console.log(`${name}: SVG + PNG`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
