import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  Key,
  Smartphone,
} from 'lucide-react';
import { HikingList } from '../types';
import { shareService } from '../services/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: HikingList;
  creatorName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  list,
  creatorName,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'card' | 'text' | 'code'>('link');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shareUrl = shareService.encodeShareLink(list, creatorName);
  const shareCode = shareService.generateShareCode(list);
  const markdownText = shareService.generateMarkdownText(list, creatorName);

  // Render canvas when card tab is selected
  useEffect(() => {
    if (activeTab === 'card' && canvasRef.current) {
      shareService.drawShareCard(canvasRef.current, list, creatorName);
    }
  }, [activeTab, list, creatorName]);

  const handleCopy = async (text: string, type: 'text' | 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else if (type === 'text') {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handleDownloadCard = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `徒步装备卡-${list.title.replace(/\s+/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">社交分享徒步清单</h2>
              <p className="text-xs text-[#DCD8CD]">与同行队友协同检查、分享装备搭配经验</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E1D8] bg-[#F5F5F0] px-4 text-xs font-medium text-[#7A7465] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>网页专属链接</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'card'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>生成图片卡片</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>微信群聊文本</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>分享口令码</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAF9F5]">
          {/* Tab 1: Web Link */}
          {activeTab === 'link' && (
            <div className="space-y-3">
              <p className="text-xs text-[#6B6555] leading-relaxed">
                复制专属链接发送给同行队友。队友无需预先注册，即可直接打开核对所有装备清单与打包进度，也可以将其一键克隆为专属清单：
              </p>

              <div className="p-3 bg-white rounded-xl border border-[#D9D4C7]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-transparent text-xs font-mono text-[#2C2C2C] truncate focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(shareUrl, 'link')}
                    className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '已复制' : '复制链接'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-[#F0EEE8] border border-[#D9D4C7] rounded-xl text-[11px] text-[#5A5A40] space-y-1">
                <p className="font-bold">🌟 离线无缝支持说明：</p>
                <p className="text-[#6B6555]">该链接包含完整的装备状态压缩凭证，即使队友在户外信号微弱的山野营地打开，也能完全离线解析和保存！</p>
              </div>
            </div>
          )}

          {/* Tab 2: Canvas Card */}
          {activeTab === 'card' && (
            <div className="space-y-3 text-center">
              <p className="text-xs text-[#6B6555]">
                专为朋友圈、小红书与户外交流设计的装备卡片，展示打包完成度与分类装备重量：
              </p>

              <div className="border border-[#D9D4C7] rounded-2xl overflow-hidden shadow-sm max-h-[380px] overflow-y-auto bg-[#2C2C22] p-2 flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg shadow-md"
                  style={{ maxHeight: '350px' }}
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadCard}
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>下载高清装备分享海报图片 (PNG)</span>
              </button>
            </div>
          )}

          {/* Tab 3: Formatted Markdown/Text */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#6B6555]">适合直接粘贴到微信、QQ、户外论坛群组：</p>
                <button
                  type="button"
                  onClick={() => handleCopy(markdownText, 'text')}
                  className="px-2.5 py-1 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? '已复制文本' : '一键复制'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={10}
                value={markdownText}
                className="w-full p-3 bg-white border border-[#D9D4C7] rounded-xl text-xs font-mono text-[#2C2C2C] focus:outline-none select-all"
              />
            </div>
          )}

          {/* Tab 4: Share Code */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <p className="text-xs text-[#6B6555]">
                专属分享口令，队友在应用内输入此口令即可迅速载入此清单：
              </p>

              <div className="p-5 bg-white border-2 border-dashed border-[#5A5A40]/40 rounded-2xl text-center space-y-2">
                <span className="text-2xl font-mono font-extrabold text-[#5A5A40] tracking-wider">
                  {shareCode}
                </span>
                <p className="text-[11px] text-[#7A7465]">
                  有效期限：永久有效（包含 {list.items.length} 件装备与分类配置）
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(shareCode, 'code')}
                  className="mx-auto px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '已复制口令' : '复制分享口令'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
