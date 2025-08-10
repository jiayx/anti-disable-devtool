// content.js - 内容脚本，负责注入 injector.js 并转发统计消息

(function() {
  'use strict';

  function postMessageWithReply(message, { timeout = 5000, target = window, targetOrigin = '*' } = {}) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

      function onMessage(e) {
        // 建议校验 e.origin & e.source
        if (e.source !== window) return;
        const d = e.data;
        if (!d || d.__replyTo !== requestId) return;
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
        resolve(d.payload || true);
      }

      window.addEventListener('message', onMessage);
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('postMessage timeout'));
      }, timeout);

      target.postMessage({ __reqId: requestId, ...message }, targetOrigin);
    });
  }

  // addListener 的回调函数不可为异步，否则对方无法收到回复消息。需要使用异步函数就用匿名 async 函数包装
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    console.log('[Anti-Disable-DevTool] content 收到消息:', msg);
    if (msg?.target === 'page') {
      // 发送消息到 injector，仅转发 target 为 page 的消息

      (async () => {
        try {
          const response = await postMessageWithReply({ __from: 'ext', ...msg });
          console.log('[Anti-Disable-DevTool] content 回复消息:', response);
          sendResponse(response);
        } catch (e) {
          console.error('[Anti-Disable-DevTool] content postMessageWithReply 出错:', e);
          sendResponse(false);
        }
      })();
    }
    return true;
  });
})();
