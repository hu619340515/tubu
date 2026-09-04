import { HikingList, SharedListPayload } from '../types';

export const shareService = {
  encodeShareLink(list: HikingList, creatorName: string): string {
    const payload: SharedListPayload = {
      version: 1,
      title: list.title,
      destination: list.destination,
      trailType: list.trailType,
      durationDays: list.durationDays,
      creatorName,
      categories: list.customCategories,
      items: list.items,
      shareDate: new Date().toISOString().split('T')[0],
    };

    const jsonStr = JSON.stringify(payload);
    // Safe base64 encoding for Unicode
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    const base64 = btoa(utf8Bytes);

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${base64}`;
  },

  decodeShareLink(hashString: string): SharedListPayload | null {
    try {
      let base64 = '';
      if (hashString.startsWith('#share=')) {
        base64 = hashString.replace('#share=', '');
      } else if (hashString.startsWith('share=')) {
        base64 = hashString.replace('share=', '');
      } else {
        base64 = hashString;
      }

      if (!base64) return null;

      const binaryStr = atob(base64);
      const decodedStr = decodeURIComponent(
        Array.prototype.map.call(binaryStr, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(decodedStr);
    } catch (e) {
      console.error('Failed to decode share string:', e);
      return null;
    }
  },

  generateShareCode(list: HikingList): string {
    const pinyinOrLetters = list.destination
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
      .slice(0, 4);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HIKE-${pinyinOrLetters || 'TRAIL'}-${randomHex}`;
  },

  generateMarkdownText(list: HikingList, creatorName: string): string {
    const totalItems = list.items.length;
    const packedItems = list.items.filter((i) => i.packed).length;
    const totalGrams = list.items.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);
    const packedGrams = list.items.filter((i) => i.packed).reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);

    let md = `🏔️ **【${list.title}】徒步装备清单**\n`;
    md += `📍 目的地: ${list.destination} | 行程: ${list.durationDays}天\n`;
    md += `👤 整理驴友: ${creatorName}\n`;
    md += `📊 打包进度: ${packedItems}/${totalItems} (${Math.round((packedItems / (totalItems || 1)) * 100)}%)\n`;
    md += `⚖️ 背包总重: ${(totalGrams / 1000).toFixed(2)} kg (已打包 ${(packedGrams / 1000).toFixed(2)} kg)\n\n`;

    (list.customCategories || []).forEach((cat) => {
      const catItems = (list.items || []).filter((i) => i.categoryId === cat.id);
      if (catItems.length === 0) return;

      const catWeight = catItems.reduce((s, i) => s + i.weightGrams * i.quantity, 0);
      md += `📁 **${cat.name}** (${(catWeight / 1000).toFixed(2)}kg)\n`;
      catItems.forEach((item) => {
        const check = item.packed ? '✅' : '⬜';
        const essential = item.isEssential ? ' ★[必带]' : '';
        const weight = item.weightGrams > 0 ? ` (${item.weightGrams}g × ${item.quantity})` : '';
        const note = item.notes ? ` - 备注: ${item.notes}` : '';
        md += `${check} ${item.name}${weight}${essential}${note}\n`;
      });
      md += `\n`;
    });

    md += `🔗 由【溜个弯】整理生成，支持离线打卡与天气查询。`;
    return md;
  },

  drawShareCard(canvas: HTMLCanvasElement, list: HikingList, creatorName: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 1100;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Warm Earthy Forest / Olive Charcoal)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#26261C');
    bgGrad.addColorStop(0.35, '#353528');
    bgGrad.addColorStop(1, '#1A1A14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Header Mountain Peaks
    ctx.fillStyle = 'rgba(210, 125, 89, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(240, 100);
    ctx.lineTo(480, 260);
    ctx.lineTo(800, 110);
    ctx.lineTo(800, 260);
    ctx.lineTo(0, 260);
    ctx.fill();

    // App Badge
    ctx.fillStyle = '#D27D59';
    ctx.beginPath();
    ctx.roundRect(40, 40, 140, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🏔️ 徒步清单检查站', 48, 62);

    // Date
    ctx.fillStyle = '#DCD8CD';
    ctx.font = '14px sans-serif';
    ctx.fillText(`生成时间: ${new Date().toLocaleDateString('zh-CN')}`, 600, 62);

    // List Title
    ctx.fillStyle = '#FAF9F5';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.fillText(list.title.slice(0, 22), 40, 125);

    // Destination & Creator
    ctx.fillStyle = '#D27D59';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`📍 ${list.destination} · ${list.durationDays}日线`, 40, 165);

    ctx.fillStyle = '#DCD8CD';
    ctx.font = '16px sans-serif';
    ctx.fillText(`领队/整理驴友: ${creatorName}`, 40, 195);

    // Summary Card
    const totalItems = list.items.length;
    const packedItems = list.items.filter((i) => i.packed).length;
    const totalWeightGrams = list.items.reduce((s, i) => s + i.weightGrams * i.quantity, 0);
    const completionPercent = Math.round((packedItems / (totalItems || 1)) * 100);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(40, 220, 720, 110, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Stat 1: Completion
    ctx.fillStyle = '#DCD8CD';
    ctx.font = '14px sans-serif';
    ctx.fillText('打包完成度', 70, 260);
    ctx.fillStyle = '#D27D59';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`${completionPercent}%`, 70, 305);

    // Stat 2: Items
    ctx.fillStyle = '#DCD8CD';
    ctx.font = '14px sans-serif';
    ctx.fillText('已核对装备', 300, 260);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${packedItems} / ${totalItems} 件`, 300, 305);

    // Stat 3: Weight
    ctx.fillStyle = '#DCD8CD';
    ctx.font = '14px sans-serif';
    ctx.fillText('预计背负重量', 530, 260);
    ctx.fillStyle = '#EAE7DF';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${(totalWeightGrams / 1000).toFixed(2)} kg`, 530, 305);

    // Progress bar inside summary
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(70, 315, 660, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#D27D59';
    ctx.beginPath();
    ctx.roundRect(70, 315, 660 * (completionPercent / 100), 6, 3);
    ctx.fill();

    // Gear Categories Box
    let currentY = 370;
    ctx.fillStyle = '#FAF9F5';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('装备分类概览与重点物品：', 40, currentY);
    currentY += 28;

    const visibleCats = (list.customCategories || []).slice(0, 6);
    visibleCats.forEach((cat) => {
      const itemsInCat = (list.items || []).filter((i) => i.categoryId === cat.id);
      if (itemsInCat.length === 0 || currentY > 960) return;

      const catWeight = itemsInCat.reduce((s, i) => s + i.weightGrams * i.quantity, 0);

      // Category banner
      ctx.fillStyle = cat.color || '#5A5A40';
      ctx.beginPath();
      ctx.roundRect(40, currentY, 6, 24, 3);
      ctx.fill();

      ctx.fillStyle = '#FAF9F5';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${cat.name}`, 55, currentY + 18);

      ctx.fillStyle = '#DCD8CD';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${itemsInCat.length}件 · ${(catWeight / 1000).toFixed(2)}kg`, 220, currentY + 18);

      currentY += 32;

      // Sample 2 items per category
      itemsInCat.slice(0, 2).forEach((item) => {
        if (currentY > 980) return;
        const mark = item.packed ? '☑' : '☐';
        ctx.fillStyle = item.packed ? '#D27D59' : '#DCD8CD';
        ctx.font = '14px sans-serif';
        const star = item.isEssential ? ' ★' : '';
        const weightText = item.weightGrams > 0 ? ` (${item.weightGrams}g)` : '';
        ctx.fillText(`${mark} ${item.name}${weightText}${star}`, 60, currentY);
        currentY += 24;
      });

      currentY += 10;
    });

    // Footer Watermark & Offline guarantee
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 1020, width, 80);

    ctx.fillStyle = '#D27D59';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('🌲 溜个弯 · 无网络亦支持离线打卡与装备核验', 40, 1060);

    ctx.fillStyle = '#A8A295';
    ctx.font = '13px sans-serif';
    ctx.fillText('扫码或访问链接一键导入此专属清单', 560, 1060);
  },
};
