/* 会员资料：本设备没有开通成长会员时，只显示提示（兑换码在网站「我的 → 成长会员」里输入） */
(function () {
  let until = '';
  try { until = (JSON.parse(localStorage.getItem('vip') || '{}').until) || ''; } catch (e) {}
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (until && until >= today) return;
  document.addEventListener('DOMContentLoaded', function () {
    document.body.innerHTML = '<div class="lock"><h2>这是会员资料</h2><p>开通成长会员后可以打印全部资料。</p><p><a href="../index.html">回到网站，在「我的 → 成长会员」输入兑换码</a></p></div>';
  });
})();
