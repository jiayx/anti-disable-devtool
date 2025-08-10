
// popup.js - 扩展弹出窗口的控制逻辑

function isHttpUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

// 获取当前标签页的域名
async function getCurrentUrl() {
  try {
    const tab = await getActiveTab();
    if (!tab) {
      return null;
    }
    if (!isHttpUrl(tab.url)) {
      return tab.url;
    }
    const url = new URL(tab.url);
    return url.origin;
  } catch (e) {
    console.error('Error in getCurrentDomain:', e);
    return null;
  }
}

// 获取当前网站的配置
async function getCurrentConfig() {
  const response = await sendMessage({
    target: 'page',
    action: 'getConfig',
  });
  if (response) {
    return response;
  }

  return {
    enabled: false,
    strategy: 'isProd',
  };
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function getActiveTabId() {
  const tab = await getActiveTab();
  return tab?.id;
}

async function sendMessage(message) {
  const tabId = await getActiveTabId();
  console.log('发送消息:', tabId, message);
  const response = await chrome.tabs.sendMessage(tabId, message);
  console.log('收到回复:', response);
  return response;
}

// 保存配置到网站的 localStorage
async function saveConfigToSite(config) {
  return await sendMessage({
    target: 'page',
    action: 'saveConfig',
    payload: config
  });
}

// 更新状态显示
function updateStatusDisplay(enabled) {
  const toggleCheckbox = document.getElementById('enable-protection');
  toggleCheckbox.checked = !!enabled;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 显示当前网站
  const subtitle = document.querySelector('.subtitle');
  if (!subtitle) {
    console.error('未找到 subtitle 元素');
    return;
  }

  const toggleCheckbox = document.getElementById('enable-protection');
  if (!toggleCheckbox) {
    console.error('未找到 toggleCheckbox 元素');
    return;
  }

  const currentUrl = await getCurrentUrl();
  if (!isHttpUrl(currentUrl)) {
    subtitle.textContent = `不支持当前页面：${currentUrl}`;
    // 禁用开关和策略选择
    if (toggleCheckbox) {
      toggleCheckbox.disabled = true;
    }
    document.querySelectorAll('input[name="strategy"]').forEach(radio => {
      radio.disabled = true;
    });
    return
  }

  // 在标题下方显示当前网站
  subtitle.innerHTML = `当前网站：<strong>${currentUrl}</strong>`;

  try {
    const config = await getCurrentConfig();

    // 设置初始状态 - 确保元素存在

    if (toggleCheckbox) {
      // 先设置开关状态，再更新显示
      toggleCheckbox.checked = config.enabled;
    }
    updateStatusDisplay(config.enabled);

    // 设置当前策略选中状态
    const strategyRadio = document.getElementById(`strategy-${config.strategy}`);
    if (strategyRadio) {
      strategyRadio.checked = true;
    }
  } catch (e) {
    console.error('Error during initialization:', e);
    // 在发生错误时显示错误状态
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
      subtitle.textContent = `初始化错误：${e.message}。请刷新页面`;
    }
  }

  toggleCheckbox.addEventListener('change', async (e) => {
    const enabled = e.target.checked;

    try {
      const config = await getCurrentConfig();

      // 保存配置到网站的 localStorage
      const siteConfig = {
        enabled: enabled,
        strategy: config.strategy || 'isProd',
      };

      const configSaved = await saveConfigToSite(siteConfig);
      if (!configSaved) {
        console.error('Failed to save config to site');
      }

      // 更新显示
      updateStatusDisplay(enabled);

      // 刷新当前标签页以应用变化
      if (chrome.tabs) {
        const tabId = await getActiveTabId();
        chrome.tabs.reload(tabId);
      }
    } catch (e) {
      console.error('Error handling toggle change:', e);
      // 恢复开关状态
      e.target.checked = !enabled;
    }
  });

  // 监听策略选择变化
  const strategyRadios = document.querySelectorAll('input[name="strategy"]');
  strategyRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const strategy = e.target.value;

      try {
        const config = await getCurrentConfig();

        // 保存配置到网站的 localStorage
        const siteConfig = {
          enabled: config.enabled,
          strategy: strategy,
        };

        const configSaved = await saveConfigToSite(siteConfig);
        if (!configSaved) {
          console.error('Failed to save config to site');
        }

        // 如果当前网站已启用保护，刷新页面以应用新策略
        if (config.enabled && chrome.tabs) {
          const tabId = await getActiveTabId();
          chrome.tabs.reload(tabId);
        }
      } catch (e) {
        console.error('Error handling strategy change:', e);
      }
    });
  });
});

// 点击链接时打开新标签
document.querySelector('a[target="_blank"]').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: e.target.href });
});
