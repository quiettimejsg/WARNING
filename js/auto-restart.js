/**
 * WARNING 应用增强版 - 自动重启模块
 * 实现应用被杀死后自动重启功能
 */

// 自动重启管理器
class AutoRestartManager {
  constructor() {
    // 配置
    this.config = {
      enabled: true,                // 是否启用自动重启
      checkInterval: 5000,          // 心跳检查间隔 (毫秒)
      storageKey: 'warning_app_heartbeat', // 心跳存储键名
      serviceWorkerPath: '/service-worker.js', // Service Worker 路径
      useMultipleChannels: true,    // 使用多通道保活
      useServiceWorker: true,       // 使用 Service Worker
      useLocalStorage: true,        // 使用本地存储
      useSharedWorker: true,        // 使用 Shared Worker
      useBackgroundSync: true,      // 使用后台同步
      useBroadcastChannel: true,    // 使用广播通道
      usePeriodicSync: true,        // 使用周期性同步
      usePageVisibility: true,      // 使用页面可见性
      useBeforeUnload: true,        // 使用页面卸载事件
      useAppCache: true             // 使用应用缓存
    };
    
    // 状态变量
    this.heartbeatInterval = null;
    this.serviceWorkerRegistration = null;
    this.broadcastChannel = null;
    this.sharedWorker = null;
    this.restartAttempts = 0;
    this.lastHeartbeat = Date.now();
    this.isActive = false;
    
    // 绑定方法
    this.init = this.init.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
    this.checkHeartbeat = this.checkHeartbeat.bind(this);
    this.registerServiceWorker = this.registerServiceWorker.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
    this.enableAutoRestart = this.enableAutoRestart.bind(this);
    this.disableAutoRestart = this.disableAutoRestart.bind(this);
  }
  
  // 初始化
  async init() {
    console.log('初始化自动重启管理器...');
    
    if (!this.config.enabled) {
      console.log('自动重启功能已禁用');
      return this;
    }
    
    try {
      // 检测环境支持
      this.detectEnvironmentSupport();
      
      // 注册 Service Worker
      if (this.config.useServiceWorker) {
        await this.registerServiceWorker();
      }
      
      // 设置事件监听
      this.setupEventListeners();
      
      // 启动心跳
      this.startHeartbeat();
      
      // 尝试使用 JavaScript 桥接启用自动重启
      this.enableNativeAutoRestart();
      
      this.isActive = true;
      console.log('自动重启管理器初始化完成');
    } catch (error) {
      console.error('自动重启管理器初始化失败:', error);
    }
    
    return this;
  }
  
  // 检测环境支持
  detectEnvironmentSupport() {
    // 检测 Service Worker 支持
    if ('serviceWorker' in navigator) {
      console.log('环境支持 Service Worker');
    } else {
      console.warn('环境不支持 Service Worker，将使用备选方案');
      this.config.useServiceWorker = false;
    }
    
    // 检测 Shared Worker 支持
    if (typeof SharedWorker !== 'undefined') {
      console.log('环境支持 Shared Worker');
    } else {
      console.warn('环境不支持 Shared Worker，将使用备选方案');
      this.config.useSharedWorker = false;
    }
    
    // 检测 Broadcast Channel 支持
    if (typeof BroadcastChannel !== 'undefined') {
      console.log('环境支持 Broadcast Channel');
    } else {
      console.warn('环境不支持 Broadcast Channel，将使用备选方案');
      this.config.useBroadcastChannel = false;
    }
    
    // 检测 Background Sync 支持
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      console.log('环境支持 Background Sync');
    } else {
      console.warn('环境不支持 Background Sync，将使用备选方案');
      this.config.useBackgroundSync = false;
    }
    
    // 检测 Periodic Sync 支持
    if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
      console.log('环境支持 Periodic Sync');
    } else {
      console.warn('环境不支持 Periodic Sync，将使用备选方案');
      this.config.usePeriodicSync = false;
    }
    
    // 检测 WebView 环境
    const userAgent = navigator.userAgent.toLowerCase();
    const isWebView = userAgent.indexOf('wv') > -1 || userAgent.indexOf('webview') > -1;
    
    if (isWebView) {
      console.log('检测到 WebView 环境，将优先使用原生方法');
    }
  }
  
  // 注册 Service Worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('浏览器不支持 Service Worker');
      return false;
    }
    
    try {
      // 创建 Service Worker 文件内容
      const swContent = `
        // WARNING 应用增强版 - Service Worker
        const CACHE_NAME = 'warning-app-cache-v1';
        const HEARTBEAT_KEY = 'warning_app_heartbeat';
        
        // 安装事件
        self.addEventListener('install', (event) => {
          console.log('Service Worker 安装中...');
          // 跳过等待，立即激活
          event.waitUntil(self.skipWaiting());
        });
        
        // 激活事件
        self.addEventListener('activate', (event) => {
          console.log('Service Worker 已激活');
          // 立即控制页面
          event.waitUntil(self.clients.claim());
        });
        
        // 后台同步事件
        self.addEventListener('sync', (event) => {
          if (event.tag === 'warning-app-sync') {
            console.log('执行后台同步...');
            event.waitUntil(checkAndRestart());
          }
        });
        
        // 周期性同步事件
        self.addEventListener('periodicsync', (event) => {
          if (event.tag === 'warning-app-periodic-sync') {
            console.log('执行周期性同步...');
            event.waitUntil(checkAndRestart());
          }
        });
        
        // 推送事件
        self.addEventListener('push', (event) => {
          console.log('收到推送消息:', event.data?.text());
          event.waitUntil(checkAndRestart());
        });
        
        // 消息事件
        self.addEventListener('message', (event) => {
          console.log('Service Worker 收到消息:', event.data);
          
          if (event.data.type === 'heartbeat') {
            // 更新心跳时间戳
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'heartbeat-ack',
                  timestamp: Date.now()
                });
              });
            });
          } else if (event.data.type === 'restart-check') {
            checkAndRestart();
          }
        });
        
        // 获取客户端
        async function getClients() {
          return await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });
        }
        
        // 检查并重启应用
        async function checkAndRestart() {
          const clients = await getClients();
          
          // 如果没有活动客户端，尝试重启应用
          if (clients.length === 0) {
            console.log('没有活动客户端，尝试重启应用...');
            
            // 尝试打开应用
            const allClients = await self.clients.matchAll();
            if (allClients.length > 0) {
              // 尝试聚焦最后一个客户端
              allClients[allClients.length - 1].focus();
            } else {
              // 尝试打开新窗口
              await self.clients.openWindow('/');
            }
            
            return true;
          }
          
          return false;
        }
        
        // 定期检查心跳
        setInterval(async () => {
          const now = Date.now();
          const lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0');
          
          // 如果超过 10 秒没有心跳，尝试重启应用
          if (now - lastHeartbeat > 10000) {
            await checkAndRestart();
          }
        }, 5000);
      `;
      
      // 创建 Blob 并获取 URL
      const blob = new Blob([swContent], { type: 'text/javascript' });
      const swUrl = URL.createObjectURL(blob);
      
      // 注册 Service Worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      });
      
      this.serviceWorkerRegistration = registration;
      console.log('Service Worker 注册成功:', registration);
      
      // 设置后台同步
      if (this.config.useBackgroundSync && 'SyncManager' in window) {
        try {
          await registration.sync.register('warning-app-sync');
          console.log('后台同步注册成功');
        } catch (error) {
          console.warn('后台同步注册失败:', error);
        }
      }
      
      // 设置周期性同步
      if (this.config.usePeriodicSync && 'PeriodicSyncManager' in window) {
        try {
          await registration.periodicSync.register('warning-app-periodic-sync', {
            minInterval: 60 * 1000 // 最小间隔 1 分钟
          });
          console.log('周期性同步注册成功');
        } catch (error) {
          console.warn('周期性同步注册失败:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Service Worker 注册失败:', error);
      return false;
    }
  }
  
  // 设置事件监听
  setupEventListeners() {
    // 页面可见性变化
    if (this.config.usePageVisibility) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('页面变为可见，更新心跳...');
          this.updateHeartbeat();
        }
      });
    }
    
    // 页面卸载前
    if (this.config.useBeforeUnload) {
      window.addEventListener('beforeunload', () => {
        console.log('页面即将卸载，记录时间戳...');
        localStorage.setItem('warning_app_unload_time', Date.now().toString());
      });
    }
    
    // 页面加载
    window.addEventListener('load', () => {
      console.log('页面加载完成，检查是否为重启...');
      const unloadTime = parseInt(localStorage.getItem('warning_app_unload_time') || '0');
      const now = Date.now();
      
      // 如果在短时间内重新加载，可能是自动重启
      if (unloadTime > 0 && now - unloadTime < 5000) {
        console.log('检测到可能的自动重启');
        this.restartAttempts++;
      }
      
      // 更新心跳
      this.updateHeartbeat();
    });
    
    // 设置 Service Worker 消息监听
    if (this.config.useServiceWorker && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('收到 Service Worker 消息:', event.data);
        
        if (event.data.type === 'heartbeat-ack') {
          console.log('收到心跳确认:', event.data.timestamp);
        }
      });
    }
    
    // 设置广播通道
    if (this.config.useBroadcastChannel && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('warning_app_channel');
        
        this.broadcastChannel.addEventListener('message', (event) => {
          console.log('收到广播通道消息:', event.data);
          
          if (event.data.type === 'restart') {
            console.log('收到重启命令');
            window.location.reload();
          }
        });
        
        console.log('广播通道已设置');
      } catch (error) {
        console.warn('广播通道设置失败:', error);
      }
    }
    
    // 设置 Shared Worker
    if (this.config.useSharedWorker && typeof SharedWorker !== 'undefined') {
      try {
        // 创建 Shared Worker 内容
        const workerContent = `
          // WARNING 应用增强版 - Shared Worker
          const ports = [];
          let heartbeatInterval;
          
          // 连接事件
          self.addEventListener('connect', (event) => {
            const port = event.ports[0];
            ports.push(port);
            
            port.addEventListener('message', (event) => {
              if (event.data.type === 'heartbeat') {
                // 广播心跳到所有连接
                ports.forEach(p => {
                  p.postMessage({
                    type: 'heartbeat-ack',
                    timestamp: Date.now(),
                    connectionCount: ports.length
                  });
                });
              } else if (event.data.type === 'start-monitor') {
                // 启动监控
                if (!heartbeatInterval) {
                  heartbeatInterval = setInterval(() => {
                    // 向所有端口发送心跳检查
                    ports.forEach(p => {
                      p.postMessage({
                        type: 'check-alive',
                        timestamp: Date.now()
                      });
                    });
                  }, 5000);
                }
              }
            });
            
            port.start();
            
            // 发送初始连接消息
            port.postMessage({
              type: 'connected',
              timestamp: Date.now(),
              connectionCount: ports.length
            });
          });
        `;
        
        // 创建 Blob 并获取 URL
        const blob = new Blob([workerContent], { type: 'text/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        // 创建 Shared Worker
        this.sharedWorker = new SharedWorker(workerUrl);
        
        // 设置消息监听
        this.sharedWorker.port.addEventListener('message', (event) => {
          console.log('收到 Shared Worker 消息:', event.data);
          
          if (event.data.type === 'check-alive') {
            // 回应活跃检查
            this.sharedWorker.port.postMessage({
              type: 'heartbeat',
              timestamp: Date.now()
            });
          }
        });
        
        // 启动端口
        this.sharedWorker.port.start();
        
        // 启动监控
        this.sharedWorker.port.postMessage({
          type: 'start-monitor',
          timestamp: Date.now()
        });
        
        console.log('Shared Worker 已设置');
      } catch (error) {
        console.warn('Shared Worker 设置失败:', error);
      }
    }
  }
  
  // 启动心跳
  startHeartbeat() {
    if (this.heartbeatInterval) {
      console.warn('心跳已启动，跳过');
      return;
    }
    
    console.log('启动心跳...');
    
    // 更新初始心跳
    this.updateHeartbeat();
    
    // 设置定期心跳
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat();
    }, this.config.checkInterval);
    
    // 设置定期检查
    setInterval(() => {
      this.checkHeartbeat();
    }, this.config.checkInterval * 2);
    
    console.log('心跳已启动');
  }
  
  // 停止心跳
  stopHeartbeat() {
    if (!this.heartbeatInterval) {
      return;
    }
    
    console.log('停止心跳...');
    
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    
    console.log('心跳已停止');
  }
  
  // 更新心跳
  updateHeartbeat() {
    const now = Date.now();
    this.lastHeartbeat = now;
    
    // 更新本地存储
    if (this.config.useLocalStorage) {
      try {
        localStorage.setItem(this.config.storageKey, now.toString());
      } catch (error) {
        console.warn('更新本地存储心跳失败:', error);
      }
    }
    
    // 更新 Service Worker
    if (this.config.useServiceWorker && navigator.serviceWorker && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'heartbeat',
          timestamp: now
        });
      } catch (error) {
        console.warn('更新 Service Worker 心跳失败:', error);
      }
    }
    
    // 更新广播通道
    if (this.config.useBroadcastChannel && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'heartbeat',
          timestamp: now
        });
      } catch (error) {
        console.warn('更新广播通道心跳失败:', error);
      }
    }
    
    // 更新 Shared Worker
    if (this.config.useSharedWorker && this.sharedWorker) {
      try {
        this.sharedWorker.port.postMessage({
          type: 'heartbeat',
          timestamp: now
        });
      } catch (error) {
        console.warn('更新 Shared Worker 心跳失败:', error);
      }
    }
  }
  
  // 检查心跳
  checkHeartbeat() {
    const now = Date.now();
    const lastStoredHeartbeat = parseInt(localStorage.getItem(this.config.storageKey) || '0');
    
    // 如果本地心跳与存储心跳不一致，可能有其他实例在运行
    if (lastStoredHeartbeat > this.lastHeartbeat) {
      console.log('检测到其他实例心跳，更新本地心跳');
      this.lastHeartbeat = lastStoredHeartbeat;
    }
    
    // 如果心跳超时，尝试重启
    if (now - this.lastHeartbeat > this.config.checkInterval * 3) {
      console.warn('心跳超时，尝试重启应用...');
      this.restartApp();
    }
  }
  
  // 重启应用
  restartApp() {
    console.log('执行应用重启...');
    
    // 增加重启计数
    this.restartAttempts++;
    
    // 记录重启时间
    localStorage.setItem('warning_app_restart_time', Date.now().toString());
    localStorage.setItem('warning_app_restart_count', this.restartAttempts.toString());
    
    // 尝试使用 Service Worker 重启
    if (this.config.useServiceWorker && navigator.serviceWorker && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'restart-check',
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('通过 Service Worker 重启失败:', error);
      }
    }
    
    // 尝试使用广播通道重启
    if (this.config.useBroadcastChannel && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'restart',
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('通过广播通道重启失败:', error);
      }
    }
    
    // 尝试使用原生方法重启
    this.restartNative();
    
    // 最后尝试刷新页面
    try {
      window.location.reload();
    } catch (error) {
      console.error('页面刷新失败:', error);
    }
  }
  
  // 使用原生方法重启
  restartNative() {
    // 尝试使用 Android 桥接
    if (window.Android && typeof window.Android.restartApp === 'function') {
      try {
        console.log('尝试使用 Android 桥接重启应用...');
        window.Android.restartApp();
        return true;
      } catch (error) {
        console.warn('Android 桥接重启失败:', error);
      }
    }
    
    // 尝试使用 iOS 桥接
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.restartApp) {
      try {
        console.log('尝试使用 iOS 桥接重启应用...');
        window.webkit.messageHandlers.restartApp.postMessage({});
        return true;
      } catch (error) {
        console.warn('iOS 桥接重启失败:', error);
      }
    }
    
    return false;
  }
  
  // 启用原生自动重启
  enableNativeAutoRestart() {
    // 尝试使用 Android 桥接
    if (window.Android && typeof window.Android.enableAutoRestart === 'function') {
      try {
        console.log('尝试使用 Android 桥接启用自动重启...');
        window.Android.enableAutoRestart();
        return true;
      } catch (error) {
        console.warn('Android 桥接启用自动重启失败:', error);
      }
    }
    
    // 尝试使用 iOS 桥接
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.enableAutoRestart) {
      try {
        console.log('尝试使用 iOS 桥接启用自动重启...');
        window.webkit.messageHandlers.enableAutoRestart.postMessage({});
        return true;
      } catch (error) {
        console.warn('iOS 桥接启用自动重启失败:', error);
      }
    }
    
    return false;
  }
  
  // 启用自动重启
  enableAutoRestart() {
    if (!this.isActive) {
      this.init();
    }
    
    this.config.enabled = true;
    console.log('自动重启功能已启用');
    
    return true;
  }
  
  // 禁用自动重启
  disableAutoRestart() {
    this.config.enabled = false;
    this.stopHeartbeat();
    console.log('自动重启功能已禁用');
    
    return true;
  }
}

// 导出自动重启管理器
window.AutoRestartManager = AutoRestartManager;
