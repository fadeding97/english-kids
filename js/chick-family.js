/* 「啾啾一家」原创贴纸：替换 Twemoji 里不好看的人物图（妈妈、爸爸、宝宝、你好、再见、晚安）。
   和小角色啾啾同一画风，全部是内联 SVG，不用另外下载图片。 */
const CHICK_ART = (() => {
  const body = (extra = '', y = 0) => `<ellipse cx="50" cy="${95 + y}" rx="22" ry="3.5" fill="#000" opacity=".07"/>
    <ellipse cx="50" cy="${57 + y}" rx="36" ry="34" fill="#FFD54A"/>${extra}`;
  const cheeks = (y = 0) => `<ellipse cx="30" cy="${62 + y}" rx="5.5" ry="3.2" fill="#FF9AA2" opacity=".8"/><ellipse cx="70" cy="${62 + y}" rx="5.5" ry="3.2" fill="#FF9AA2" opacity=".8"/>`;
  const eyes = (y = 0) => `<circle cx="38" cy="${51 + y}" r="4.6" fill="#3A2A1A"/><circle cx="39.6" cy="${49.4 + y}" r="1.5" fill="#fff"/><circle cx="62" cy="${51 + y}" r="4.6" fill="#3A2A1A"/><circle cx="63.6" cy="${49.4 + y}" r="1.5" fill="#fff"/>`;
  const happy = (y = 0) => `<path d="M33 ${51 + y}q5-6 10 0M57 ${51 + y}q5-6 10 0" fill="none" stroke="#3A2A1A" stroke-width="3.4" stroke-linecap="round"/>`;
  const sleepy = (y = 0) => `<path d="M33 ${50 + y}q5 5 10 0M57 ${50 + y}q5 5 10 0" fill="none" stroke="#3A2A1A" stroke-width="3.2" stroke-linecap="round"/>`;
  const beak = (y = 0) => `<path d="M44.5 ${58 + y}h11L50 ${65.5 + y}z" fill="#FF8A3D" stroke="#FF8A3D" stroke-width="2" stroke-linejoin="round"/>`;
  const smile = (y = 0) => `<path d="M43 ${58 + y}h14q-2 11-7 11t-7-11z" fill="#FF8A3D"/>`;
  const tuft = '<path d="M44 25q4-12 8-2q3-8 6 1" fill="none" stroke="#F2B705" stroke-width="4" stroke-linecap="round"/>';
  const wingL = '<ellipse cx="17" cy="62" rx="9" ry="14" transform="rotate(25 17 62)" fill="#F7C531"/>';
  const wingR = '<ellipse cx="83" cy="62" rx="9" ry="14" transform="rotate(-25 83 62)" fill="#F7C531"/>';
  const waveR = '<ellipse cx="86" cy="36" rx="9" ry="15" transform="rotate(35 86 36)" fill="#F7C531"/><path d="M92 14q6 4 4 11M98 20q4 4 2 9" fill="none" stroke="#F2B705" stroke-width="2.6" stroke-linecap="round"/>';
  const svg = inner => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  return {
    // 妈妈：粉色蝴蝶结 + 长睫毛
    mommy: svg(`${wingL}${wingR}${body()}<path d="M34 46l-4-3M66 46l4-3M36 44l-2-4M64 44l2-4" stroke="#3A2A1A" stroke-width="2" stroke-linecap="round"/>${eyes()}${beak()}${cheeks()}
      <path d="M50 24l-13-8v16zM50 24l13-8v16z" fill="#FF7FA8"/><circle cx="50" cy="24" r="4.5" fill="#FF5C8D"/>`),
    // 爸爸：圆眼镜 + 小领结
    daddy: svg(`${wingL}${wingR}${body()}${tuft}${eyes()}<circle cx="38" cy="51" r="9" fill="none" stroke="#4A6FA5" stroke-width="2.8"/><circle cx="62" cy="51" r="9" fill="none" stroke="#4A6FA5" stroke-width="2.8"/><path d="M47 51h6" stroke="#4A6FA5" stroke-width="2.8"/>${beak()}${cheeks()}
      <path d="M50 80l-9-5v10zM50 80l9-5v10z" fill="#4C8DF0"/><circle cx="50" cy="80" r="3" fill="#2F6FD0"/>`),
    // 宝宝：从蛋壳里探出头
    baby: svg(`<ellipse cx="50" cy="95" rx="24" ry="3.5" fill="#000" opacity=".07"/><circle cx="50" cy="46" r="26" fill="#FFD54A"/><path d="M46 21q3-8 6-1" fill="none" stroke="#F2B705" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="41" cy="44" r="3.8" fill="#3A2A1A"/><circle cx="42.3" cy="42.7" r="1.2" fill="#fff"/><circle cx="59" cy="44" r="3.8" fill="#3A2A1A"/><circle cx="60.3" cy="42.7" r="1.2" fill="#fff"/><path d="M46 50h8l-4 5z" fill="#FF8A3D"/>
      <ellipse cx="33" cy="52" rx="4.5" ry="2.6" fill="#FF9AA2" opacity=".8"/><ellipse cx="67" cy="52" rx="4.5" ry="2.6" fill="#FF9AA2" opacity=".8"/>
      <path d="M20 60l8 6 7-7 8 7 7-7 7 7 8-7 7 7 8-6v8q0 26-30 26t-30-26z" fill="#FFFFFF" stroke="#E8DCCB" stroke-width="2" stroke-linejoin="round"/><path d="M30 80q6 3 10 0" stroke="#E8DCCB" stroke-width="2" fill="none" stroke-linecap="round"/>`),
    // 你好：举起翅膀打招呼
    hello: svg(`${wingL}${waveR}${body()}${tuft}${eyes()}${smile()}${cheeks()}`),
    // 再见：眯眼笑着挥手，旁边一颗小爱心
    'bye-bye': svg(`${wingL}${waveR}${body()}${tuft}${happy()}${smile()}${cheeks()}<path d="M14 26c-3-4-9-1-6 4l6 6 6-6c3-5-3-8-6-4z" fill="#FF7FA8"/>`),
    // 晚安：戴睡帽睡着了，月亮和 z
    'good night': svg(`${wingL}${wingR}${body()}${sleepy()}${beak()}${cheeks()}
      <path d="M22 36q24-30 52-4l-4 4q-22-18-44 4z" fill="#6A7FD8"/><path d="M70 32q14 4 16 18" fill="none" stroke="#6A7FD8" stroke-width="7" stroke-linecap="round"/><circle cx="87" cy="52" r="5" fill="#FFFFFF" stroke="#E0E4F7" stroke-width="2"/>
      <path d="M84 12a9 9 0 1 0 8 13a7 7 0 1 1-8-13z" fill="#FFC93C"/><text x="8" y="26" font-size="12" font-weight="900" fill="#8A95C9" font-family="Arial">z</text><text x="2" y="38" font-size="9" font-weight="900" fill="#8A95C9" font-family="Arial">z</text>`),
  };
})();
