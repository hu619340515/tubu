import { Category, HikingList, GearItem } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-shelter', name: '睡眠露营', color: '#0d9488', icon: 'Tent', isDefault: true },
  { id: 'cat-clothing', name: '服装穿戴', color: '#0284c7', icon: 'Shirt', isDefault: true },
  { id: 'cat-food', name: '饮食炊具', color: '#ea580c', icon: 'Utensils', isDefault: true },
  { id: 'cat-safety', name: '导航急救', color: '#dc2626', icon: 'Compass', isDefault: true },
  { id: 'cat-electronic', name: '电子照明', color: '#7c3aed', icon: 'Zap', isDefault: true },
  { id: 'cat-hygiene', name: '卫生防晒', color: '#059669', icon: 'ShieldCheck', isDefault: true },
  { id: 'cat-misc', name: '杂项证件', color: '#64748b', icon: 'Briefcase', isDefault: true },
];

export interface MountainPreset {
  name: string;
  region: string;
  lat: number;
  lng: number;
  elevation: number;
  recommendedSeason: string;
}

export const POPULAR_MOUNTAINS: MountainPreset[] = [
  { name: '四川·格聂神山大环线', region: '甘孜理塘', lat: 29.81, lng: 99.63, elevation: 4200, recommendedSeason: '9月-10月金秋/6月花季' },
  { name: '江西·武功山', region: '萍乡/吉安', lat: 27.46, lng: 114.18, elevation: 1918, recommendedSeason: '5月-10月高山草甸' },
  { name: '云南·梅里雪山/雨崩', region: '迪庆德钦', lat: 28.38, lng: 98.86, elevation: 3200, recommendedSeason: '10月-次年5月观日照金山' },
  { name: '四川·四姑娘山大峰', region: '阿坝小金', lat: 31.11, lng: 102.90, elevation: 5025, recommendedSeason: '6月-11月初级雪山' },
  { name: '四川·贡嘎大环线', region: '甘孜康定', lat: 29.59, lng: 101.88, elevation: 4500, recommendedSeason: '5月-6月杜鹃花/9月-10月秋色' },
  { name: '四川·稻城亚丁', region: '甘孜稻城', lat: 28.45, lng: 100.34, elevation: 4100, recommendedSeason: '9月-10月金秋彩林' },
  { name: '陕西·秦岭太白山', region: '宝鸡眉县', lat: 33.95, lng: 107.76, elevation: 3767, recommendedSeason: '6月-9月夏避暑观第四纪冰川' },
  { name: '山东·泰山', region: '泰安', lat: 36.25, lng: 117.10, elevation: 1545, recommendedSeason: '全年四季夜爬观日出' },
  { name: '安徽·黄山', region: '黄山风景区', lat: 30.13, lng: 118.17, elevation: 1864, recommendedSeason: '四季云海奇松' },
  { name: '浙江·莫干山', region: '湖州德清', lat: 30.60, lng: 119.86, elevation: 719, recommendedSeason: '春夏竹海轻徒步' },
  { name: '香港·麦理浩径', region: '西贡/新界', lat: 22.39, lng: 114.33, elevation: 400, recommendedSeason: '11月-次年3月海滨徒步' },
];

export const TEMPLATE_LISTS: Omit<HikingList, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '2026 格聂四日高海拔徒步全案',
    description: '下则通至惹迪村四日经典合规线，平均海拔4000m+，抗寒防高反与全套装备。',
    destination: '四川·格聂神山大环线',
    destinationCoords: { lat: 29.81, lng: 99.63 },
    trailType: 'high_altitude',
    durationDays: 4,
    customCategories: [...DEFAULT_CATEGORIES],
    items: [
      { id: 'gn-1', name: '舒适温标-10℃高蓬松羽绒睡袋', categoryId: 'cat-shelter', weightGrams: 1150, quantity: 1, packed: false, isEssential: true, notes: '高海拔夜间零下，保暖核心' },
      { id: 'gn-2', name: '高R值防潮充气垫 (R值≥4.5)', categoryId: 'cat-shelter', weightGrams: 520, quantity: 1, packed: false, isEssential: true },
      { id: 'gn-3', name: '高抗风双人高山四季帐', categoryId: 'cat-shelter', weightGrams: 1950, quantity: 1, packed: false, isEssential: true, notes: '配加长防风地钉' },
      { id: 'gn-4', name: '三层暴雨级GTX硬壳冲锋衣裤', categoryId: 'cat-clothing', weightGrams: 680, quantity: 1, packed: false, isEssential: true },
      { id: 'gn-5', name: '高蓬松加厚保暖羽绒服 (充绒200g+)', categoryId: 'cat-clothing', weightGrams: 580, quantity: 1, packed: false, isEssential: true },
      { id: 'gn-6', name: '重装中高帮防水徒步鞋', categoryId: 'cat-clothing', weightGrams: 1350, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'gn-7', name: '高原防高反药盒 (乙酰唑胺/布洛芬/散利痛)', categoryId: 'cat-safety', weightGrams: 150, quantity: 1, packed: false, isEssential: true },
      { id: 'gn-8', name: '分体式高山抗风气炉 & 挡风板', categoryId: 'cat-food', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
      { id: 'gn-9', name: '重载双登山杖 (外锁碳纤维/铝合金)', categoryId: 'cat-safety', weightGrams: 460, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'gn-10', name: '双离线轨迹手机 + 3C移动电源', categoryId: 'cat-electronic', weightGrams: 560, quantity: 1, packed: false, isEssential: true, notes: '两步路离线等高线卫星图已就绪' },
      { id: 'gn-11', name: 'UV400偏光防雪盲太阳镜 & 高倍防晒霜', categoryId: 'cat-hygiene', weightGrams: 120, quantity: 1, packed: false, isEssential: true },
    ],
  },
  {
    title: '武功山两日重装露营清单',
    description: '经典的草甸云海重装徒步路线，包含帐篷、炊具及保暖层。',
    destination: '江西·武功山',
    destinationCoords: { lat: 27.46, lng: 114.18 },
    trailType: 'overnight_camp',
    durationDays: 2,
    customCategories: [...DEFAULT_CATEGORIES],
    items: [
      { id: 'wgs-1', name: '双人双层抗风帐篷', categoryId: 'cat-shelter', weightGrams: 1850, quantity: 1, packed: false, isEssential: true, notes: '附防风绳和地钉8根' },
      { id: 'wgs-2', name: '充气防潮垫 (R值>3.0)', categoryId: 'cat-shelter', weightGrams: 480, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-3', name: '舒适温标0°C羽绒睡袋', categoryId: 'cat-shelter', weightGrams: 900, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-4', name: '充气露营小枕头', categoryId: 'cat-shelter', weightGrams: 90, quantity: 1, packed: false, isEssential: false },
      
      { id: 'wgs-5', name: '高帮防水徒步鞋', categoryId: 'cat-clothing', weightGrams: 1100, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'wgs-6', name: '三层硬壳冲锋衣 (防暴雨)', categoryId: 'cat-clothing', weightGrams: 420, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-7', name: '排汗速干长袖T恤', categoryId: 'cat-clothing', weightGrams: 160, quantity: 2, packed: false, isEssential: true },
      { id: 'wgs-8', name: '轻量抓绒保暖层', categoryId: 'cat-clothing', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-9', name: '速干徒步长裤', categoryId: 'cat-clothing', weightGrams: 290, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'wgs-10', name: '美利奴羊毛徒步袜', categoryId: 'cat-clothing', weightGrams: 80, quantity: 2, packed: false, isEssential: true },
      { id: 'wgs-11', name: '登山遮阳帽 & 抓绒帽', categoryId: 'cat-clothing', weightGrams: 110, quantity: 1, packed: false, isEssential: true },

      { id: 'wgs-12', name: '分体式防风户外气炉', categoryId: 'cat-food', weightGrams: 230, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-13', name: '高山扁气罐 G2 (230g)', categoryId: 'cat-food', weightGrams: 370, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-14', name: '阳极氧化铝便携套锅', categoryId: 'cat-food', weightGrams: 310, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-15', name: '折叠钛勺叉', categoryId: 'cat-food', weightGrams: 18, quantity: 1, packed: false, isEssential: false },
      { id: 'wgs-16', name: '户外便携滤水器/净水片', categoryId: 'cat-food', weightGrams: 75, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-17', name: '冻干主食米饭/脱水面', categoryId: 'cat-food', weightGrams: 400, quantity: 2, packed: false, isEssential: true },
      { id: 'wgs-18', name: '电解质冲剂 & 高能路粮坚果', categoryId: 'cat-food', weightGrams: 350, quantity: 1, packed: false, isEssential: true },

      { id: 'wgs-19', name: '折叠碳纤维登山杖一对', categoryId: 'cat-safety', weightGrams: 380, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-20', name: '离线轨迹手机/两步路已载轨迹', categoryId: 'cat-safety', weightGrams: 210, quantity: 1, packed: true, isEssential: true },
      { id: 'wgs-21', name: '户外急救包 (创可贴/绷带/云南白药)', categoryId: 'cat-safety', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-22', name: '高频求生口哨', categoryId: 'cat-safety', weightGrams: 15, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-23', name: '双面镀铝防风保温救生毯', categoryId: 'cat-safety', weightGrams: 60, quantity: 1, packed: false, isEssential: true },

      { id: 'wgs-24', name: '户外头灯 (300流明以上)', categoryId: 'cat-electronic', weightGrams: 90, quantity: 1, packed: false, isEssential: true, notes: '检查电量充足' },
      { id: 'wgs-25', name: '大容量防水充电宝 (20000mAh)', categoryId: 'cat-electronic', weightGrams: 390, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-26', name: '三合一快充数据线', categoryId: 'cat-electronic', weightGrams: 45, quantity: 1, packed: false, isEssential: true },

      { id: 'wgs-27', name: 'SPF50+防晒霜 & 唇膏', categoryId: 'cat-hygiene', weightGrams: 80, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-28', name: '偏光防紫外线太阳镜 (UV400)', categoryId: 'cat-hygiene', weightGrams: 35, quantity: 1, packed: false, isEssential: true },
      { id: 'wgs-29', name: '可降解加厚垃圾袋 (无痕山林LNT)', categoryId: 'cat-hygiene', weightGrams: 30, quantity: 3, packed: false, isEssential: true },
      { id: 'wgs-30', name: '免洗抑菌洗手凝胶', categoryId: 'cat-hygiene', weightGrams: 50, quantity: 1, packed: false, isEssential: false },
    ],
  },
  {
    title: '单日经典轻装徒步清单 (15-25km)',
    description: '适合周末一日周边山野拉练，极简轻快，重视补给与安全。',
    destination: '浙江·莫干山',
    destinationCoords: { lat: 30.60, lng: 119.86 },
    trailType: 'day_hike',
    durationDays: 1,
    customCategories: [...DEFAULT_CATEGORIES],
    items: [
      { id: 'dh-1', name: '中低帮轻量徒步鞋/越野跑鞋', categoryId: 'cat-clothing', weightGrams: 750, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'dh-2', name: '轻量皮肤风衣/单层冲锋衣', categoryId: 'cat-clothing', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-3', name: '速干短袖/长袖', categoryId: 'cat-clothing', weightGrams: 140, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'dh-4', name: '排汗速干短裤/束脚裤', categoryId: 'cat-clothing', weightGrams: 200, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
      { id: 'dh-5', name: '徒步速干帽/空顶帽', categoryId: 'cat-clothing', weightGrams: 60, quantity: 1, packed: false, isEssential: false },
      
      { id: 'dh-6', name: '双肩轻量徒步包 (15-20L)', categoryId: 'cat-misc', weightGrams: 450, quantity: 1, packed: true, isEssential: true },
      { id: 'dh-7', name: '水袋/运动水壶 (1.5L-2L)', categoryId: 'cat-food', weightGrams: 150, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-8', name: '路粮面包/能量胶/士力架', categoryId: 'cat-food', weightGrams: 250, quantity: 3, packed: false, isEssential: true },
      { id: 'dh-9', name: '电解质泡腾片/运动饮料', categoryId: 'cat-food', weightGrams: 60, quantity: 1, packed: false, isEssential: true },
      
      { id: 'dh-10', name: '超轻折叠登山杖 (单根/双根)', categoryId: 'cat-safety', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-11', name: '便携迷你充电宝 (10000mAh)', categoryId: 'cat-electronic', weightGrams: 190, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-12', name: '迷你急救创口贴 & 止痛片', categoryId: 'cat-safety', weightGrams: 40, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-13', name: '防晒喷雾/防晒霜', categoryId: 'cat-hygiene', weightGrams: 70, quantity: 1, packed: false, isEssential: true },
      { id: 'dh-14', name: '纸巾 & 密封垃圾袋', categoryId: 'cat-hygiene', weightGrams: 30, quantity: 1, packed: false, isEssential: true },
    ],
  },
  {
    title: '高原高海拔雪山徒步进阶清单',
    description: '针对海拔3000-5000米低温、强风、强紫外线环境设计，包含专业防护。',
    destination: '四川·四姑娘山大峰',
    destinationCoords: { lat: 31.11, lng: 102.90 },
    trailType: 'high_altitude',
    durationDays: 3,
    customCategories: [...DEFAULT_CATEGORIES],
    items: [
      { id: 'ha-1', name: '800蓬高蓬松度厚羽绒服 (充绒250g+)', categoryId: 'cat-clothing', weightGrams: 650, quantity: 1, packed: false, isEssential: true, notes: '营地与冲顶保暖关键' },
      { id: 'ha-2', name: '重装GORE-TEX专业冲锋衣裤', categoryId: 'cat-clothing', weightGrams: 780, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-3', name: '美利奴羊毛保暖内衣裤套件', categoryId: 'cat-clothing', weightGrams: 380, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-4', name: '防风防水厚手套 (分指+抓绒内胆)', categoryId: 'cat-clothing', weightGrams: 190, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-5', name: '防风护耳保暖羊毛帽 & 魔术头巾', categoryId: 'cat-clothing', weightGrams: 95, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-6', name: '简易轻量防滑冰爪 (6齿/10齿)', categoryId: 'cat-safety', weightGrams: 450, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-7', name: '专业雪套 (防雪防泥透气)', categoryId: 'cat-clothing', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-8', name: '四类(Cat.4)高山雪盲防风太阳镜', categoryId: 'cat-hygiene', weightGrams: 45, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-9', name: '高原保温壶 (1000ml 保温24h)', categoryId: 'cat-food', weightGrams: 520, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-10', name: '便携指夹式血氧仪 (监测高反)', categoryId: 'cat-safety', weightGrams: 65, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-11', name: '高反应急药物 (乙酰唑胺/布洛芬/红景天)', categoryId: 'cat-safety', weightGrams: 80, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-12', name: '专业户外头灯 (低温抗冻锂电池)', categoryId: 'cat-electronic', weightGrams: 110, quantity: 1, packed: false, isEssential: true },
      { id: 'ha-13', name: '暖宝宝发热贴 (给手机与脚趾防冻)', categoryId: 'cat-misc', weightGrams: 200, quantity: 4, packed: false, isEssential: false },
    ],
  },
];
