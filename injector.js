// 该脚本在页面最早期执行，通过劫持 isProd 属性 或者 定时器 API 来禁用 disable-devtool 的功能

(function() {
  'use strict';

  console.log('[Anti-Disable-DevTool] 正在初始化...');

  let config = null;
  let initialized = false;

  // 从 localStorage 读取配置
  function loadConfig() {
    try {
      const configStr = localStorage.getItem('antiDisableDevtoolConfig');
      console.log('[Anti-Disable-DevTool] 从 localStorage 加载配置:', configStr);
      if (configStr) {
        config = JSON.parse(configStr);
        console.log('[Anti-Disable-DevTool] 从 localStorage 加载配置:', config);
        return config;
      } else {
        console.log('[Anti-Disable-DevTool] localStorage 中没有配置');
        return null;
      }
    } catch (e) {
      console.error('[Anti-Disable-DevTool] 读取配置失败:', e);
      return null;
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem('antiDisableDevtoolConfig', JSON.stringify(config));
      console.log('[Anti-Disable-DevTool] 保存配置到 localStorage:', config);
      return true;
    } catch (e) {
      console.error('[Anti-Disable-DevTool] 保存配置失败:', e);
      return false;
    }
  }

  // ========== 策略1: 拦截 isProd 属性设置 ==========
  const interceptIsProd = function () {
    let interceptCount = 0;

    // 劫持 Object.defineProperty 来拦截 isProd 属性
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
      // 拦截 isProd 属性设置
      if (prop === 'isProd') {
        interceptCount++;
        console.log(`[Anti-Disable-DevTool] 拦截 isProd 属性 #${interceptCount}，强制设为 false`);

        // 修改描述符，确保返回 false
        if (descriptor.hasOwnProperty('value')) {
          descriptor.value = false;
          descriptor.writable = false;
        } else if (descriptor.hasOwnProperty('get')) {
          descriptor.get = function() {
            console.log('[Anti-Disable-DevTool] isProd getter 被调用，返回 false');
            return false;
          };
        } else {
          // 如果没有 value 或 get，创建一个新的
          descriptor = {
            value: false,
            writable: false,
            configurable: false
          };
        }
      }

      return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    console.log('[Anti-Disable-DevTool] isProd 拦截器已激活 🔓');
  };


  // ========== 策略2: 定时器劫持 ==========
  const interceptTimers = function () {
    // 保存原始的定时器函数
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalClearInterval = window.clearInterval;
    const originalClearTimeout = window.clearTimeout;

    // 存储定时器信息
    const timerMap = new Map();
    let blockedCount = 0;

    // 检查函数是否包含 disable-devtool 相关代码
    const isDisableDevtoolCode = (func) => {
      if (typeof func !== 'function') return false;

      const funcStr = func.toString();

      // disable-devtool 的特征代码
      const signatures = [
        'ondevtoolclose',
        'isSuspend',
      ];

      // 检查函数字符串是否包含所有特征
      return signatures.every(signature => funcStr.includes(signature));
    };

    // 劫持 setInterval
    window.setInterval = function(func, delay, ...args) {
      // 检查是否是 disable-devtool 的定时器
      if (isDisableDevtoolCode(func)) {
        blockedCount++;
        console.log(`[Anti-Disable-DevTool] 拦截第 ${blockedCount} 个 disable-devtool 定时器 (setInterval)`);

        // 返回一个假的定时器 ID
        return 999999 + blockedCount;
      }

      // 正常的定时器，调用原始函数
      const realId = originalSetInterval.apply(this, arguments);

      // 记录正常定时器信息
      timerMap.set(realId, {
        type: 'interval',
        func: func,
        delay: delay
      });

      return realId;
    };

    // 劫持 setTimeout
    window.setTimeout = function(func, delay, ...args) {
      // 处理字符串形式的代码
      if (typeof func === 'string' && func.includes('debugger')) {
        blockedCount++;
        console.log(`[Anti-Disable-DevTool] 拦截第 ${blockedCount} 个 debugger 字符串 (setTimeout)`);
        return 999999 + blockedCount;
      }

      // 检查是否是 disable-devtool 的定时器
      if (isDisableDevtoolCode(func)) {
        blockedCount++;
        console.log(`[Anti-Disable-DevTool] 拦截第 ${blockedCount} 个 disable-devtool 定时器 (setTimeout)`);
        // 返回一个假的定时器 ID
        return 999999 + blockedCount;
      }

      // 正常的定时器，调用原始函数
      const realId = originalSetTimeout.apply(this, arguments);

      // 记录正常定时器信息
      timerMap.set(realId, {
        type: 'timeout',
        func: func,
        delay: delay
      });

      return realId;
    };

    // 劫持 clearInterval
    window.clearInterval = function(id) {
      // 如果是假 ID，直接返回
      if (id > 999999) return;

      // 清除记录
      timerMap.delete(id);
      // 调用原始函数
      return originalClearInterval.apply(this, arguments);
    };

    // 劫持 clearTimeout
    window.clearTimeout = function(id) {
      // 如果是假 ID，直接返回
      if (id > 999999) return;

      // 清除记录
      timerMap.delete(id);
      // 调用原始函数
      return originalClearTimeout.apply(this, arguments);
    };

    // 清理已知的 disable-devtool 定时器
    const cleanupSuspiciousTimers = () => {
      let cleaned = 0;

      // 遍历记录的定时器
      timerMap.forEach((info, id) => {
        if (isDisableDevtoolCode(info.func)) {
          console.log('[Anti-Disable-DevTool] 清理可疑定时器:', id);
          if (info.type === 'interval') {
            originalClearInterval(id);
          } else {
            originalClearTimeout(id);
          }
          timerMap.delete(id);
          cleaned++;
        }
      });

      console.log(`[Anti-Disable-DevTool] 清理了 ${cleaned} 个可疑定时器`);
    };

    // 暴力清理：清理所有最近创建的定时器（仅在紧急情况使用）
    const bruteForceCleanup = () => {
      console.log('[Anti-Disable-DevTool] 执行紧急清理（清理前100个定时器）...');
      for (let i = 1; i <= 100; i++) {
        try {
          originalClearInterval(i);
          originalClearTimeout(i);
        } catch (e) {}
      }
    };

    // 提供手动清理功能（可在控制台调用）
    window.__antiDisableDevtool = {
      // 清理可疑定时器
      cleanup: cleanupSuspiciousTimers,
      // 紧急清理（暴力清理前100个）
      bruteForce: bruteForceCleanup,
      // 显示所有定时器
      showTimers: () => {
        console.table(Array.from(timerMap.entries()).map(([id, info]) => ({
          id,
          type: info.type,
          delay: info.delay,
          suspicious: isDisableDevtoolCode(info.func) ? '⚠️ 可疑' : '✅ 正常'
        })));
      },
      // 获取统计信息
      getStats: () => {
        const suspicious = Array.from(timerMap.values()).filter(info => isDisableDevtoolCode(info.func));
        const stats = {
          '已拦截': blockedCount,
          '正在运行': timerMap.size,
          '可疑定时器': suspicious.length
        };
        console.log('[Anti-Disable-DevTool] 统计信息:');
        console.table(stats);
        return stats;
      }
    };

    console.log('[Anti-Disable-DevTool] 定时器拦截器已激活 🔓');
    console.log('[Anti-Disable-DevTool] 提示：使用 __antiDisableDevtool.getStats() 查看统计');
    console.log('[Anti-Disable-DevTool] 提示：使用 __antiDisableDevtool.showTimers() 查看定时器');
  };

  // 初始化函数，根据配置启用相应功能
  function init(cfg) {
    if (initialized) {
      console.log('[Anti-Disable-DevTool] 已经初始化，跳过');
      return;
    }

    config = cfg;

    // 如果未启用保护，直接返回
    if (!config.enabled) {
      console.log('[Anti-Disable-DevTool] 当前网站未启用保护');
      return;
    }

    console.log(`[Anti-Disable-DevTool] 保护已启用，策略: ${config.strategy}`);

    // 根据配置的策略启用相应功能
    switch (config.strategy) {
      case 'isProd':
        interceptIsProd();
        break;
      case 'timer':
        interceptTimers();
        break;
      case 'both':
        interceptIsProd();
        interceptTimers();
        break;
      default:
        interceptIsProd(); // 默认使用 isProd
    }

    initialized = true;
  }

  // 主初始化逻辑
  function main() {
    // 尝试从 localStorage 加载配置
    const cfg = loadConfig();

    if (cfg) {
      // 如果有配置，使用配置初始化
      init(cfg);
    } else {
      // 如果没有配置，默认不启用保护
      console.log('[Anti-Disable-DevTool] 没有找到配置，默认不启用保护');
      console.log('[Anti-Disable-DevTool] 请通过扩展弹窗为该网站启用保护');
    }
  }

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || d?.__from !== 'ext') return;

    console.log('[Anti-Disable-DevTool] injector 收到消息: ', e.data);

    switch (d.action) {
      case 'saveConfig':
        saveConfig(d.payload);
        window.postMessage({ __from: 'page', action: 'ack', __replyTo: d.__reqId }, '*');
        break;
      case 'getConfig':
        const cfg = loadConfig();
        window.postMessage({ __from: 'page', action: 'ack', __replyTo: d.__reqId, payload: cfg }, '*');
        break;
    }
  });

  // 立即执行主初始化
  main();

})();
