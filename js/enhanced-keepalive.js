/**
 * WARNING 应用增强版 - 增强保活模块
 * 实现更多保活功能，防止应用被系统杀死
 */

// 增强保活管理器
class EnhancedKeepAliveManager {
  constructor() {
    // 保活配置
    this.config = {
      wakeLockEnabled: true,           // 是否启用唤醒锁
      serviceWorkerEnabled: true,      // 是否启用Service Worker
      periodicSyncEnabled: true,       // 是否启用周期性同步
      heartbeatInterval: 10000,        // 心跳间隔 (毫秒)
      backgroundTaskInterval: 20000,   // 后台任务间隔 (毫秒)
      visibilityCheckInterval: 5000,   // 可见性检查间隔 (毫秒)
      storageKey: 'warning_enhanced',  // localStorage键名
      swPath: '/sw.js'                 // Service Worker路径
    };
    
    // 状态变量
    this.wakeLock = null;
    this.heartbeatTimer = null;
    this.backgroundTaskTimer = null;
    this.visibilityCheckTimer = null;
    this.swRegistration = null;
    this.isActive = false;
    
    // 绑定方法
    this.init = this.init.bind(this);
    this.startKeepAlive = this.startKeepAlive.bind(this);
    this.stopKeepAlive = this.stopKeepAlive.bind(this);
    this.acquireWakeLock = this.acquireWakeLock.bind(this);
    this.releaseWakeLock = this.releaseWakeLock.bind(this);
    this.registerServiceWorker = this.registerServiceWorker.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
  }
  
  // 初始化增强保活
  async init() {
    console.log('初始化增强保活管理器...');
    
    // 检查浏览器支持
    this.checkBrowserSupport();
    
    // 注册事件监听
    this.registerEventListeners();
    
    // 创建Service Worker脚本
    this.createServiceWorkerScript();
    
    return this;
  }
  
  // 检查浏览器支持情况
  checkBrowserSupport() {
    // 检查WakeLock API支持
    if ('wakeLock' in navigator) {
      console.log('浏览器支持WakeLock API');
    } else {
      console.warn('浏览器不支持WakeLock API，将使用替代方案');
      this.config.wakeLockEnabled = false;
    }
    
    // 检查Service Worker支持
    if ('serviceWorker' in navigator) {
      console.log('浏览器支持Service Worker');
    } else {
      console.warn('浏览器不支持Service Worker，将使用替代方案');
      this.config.serviceWorkerEnabled = false;
    }
    
    // 检查周期性同步支持
    if ('periodicSync' in (navigator.serviceWorker || {})) {
      console.log('浏览器支持周期性同步');
    } else {
      console.warn('浏览器不支持周期性同步，将使用替代方案');
      this.config.periodicSyncEnabled = false;
    }
  }
  
  // 注册事件监听
  registerEventListeners() {
    // 页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('页面变为可见，启动保活机制');
        this.startKeepAlive();
      } else {
        console.log('页面变为不可见，调整保活策略');
        // 页面不可见时不停止保活，而是调整策略
        this.adjustBackgroundKeepAlive();
      }
    });
    
    // 页面焦点变化监听
    window.addEventListener('focus', () => {
      console.log('页面获得焦点，启动保活机制');
      this.startKeepAlive();
    });
    
    window.addEventListener('blur', () => {
      console.log('页面失去焦点，调整保活策略');
      // 页面失去焦点时不停止保活，而是调整策略
      this.adjustBackgroundKeepAlive();
    });
    
    // 页面关闭前保存状态
    window.addEventListener('beforeunload', () => {
      console.log('页面即将关闭，保存状态');
      this.saveState();
    });
    
    // 设备电源状态变化监听
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        battery.addEventListener('chargingchange', () => {
          console.log('设备充电状态变化，调整保活策略');
          this.adjustPowerKeepAlive(battery.charging);
        });
      });
    }
  }
  
  // 创建Service Worker脚本
  createServiceWorkerScript() {
    if (!this.config.serviceWorkerEnabled) return;
    
    // 创建Service Worker脚本内容
    const swContent = `
      // WARNING 应用增强版 - Service Worker
      const CACHE_NAME = 'warning-enhanced-cache-v1';
      const OFFLINE_URL = 'index.html';
      
      // 安装事件
      self.addEventListener('install', (event) => {
        console.log('Service Worker 安装中...');
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
              OFFLINE_URL,
              'css/styles.css',
              'js/alarm.js',
              'js/keepalive.js',
              'js/device.js',
              'js/main.js',
              'audio/warning_siren.mp3'
            ]);
          })
        );
        // 立即激活
        self.skipWaiting();
      });
      
      // 激活事件
      self.addEventListener('activate', (event) => {
        console.log('Service Worker 已激活');
        event.waitUntil(
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.filter((cacheName) => {
                return cacheName !== CACHE_NAME;
              }).map((cacheName) => {
                return caches.delete(cacheName);
              })
            );
          }).then(() => {
            // 立即接管页面
            return self.clients.claim();
          })
        );
      });
      
      // 请求拦截
      self.addEventListener('fetch', (event) => {
        event.respondWith(
          caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
              // 缓存新请求
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
            }).catch(() => {
              // 离线回退
              return caches.match(OFFLINE_URL);
            });
          })
        );
      });
      
      // 后台同步
      self.addEventListener('sync', (event) => {
        if (event.tag === 'warning-sync') {
          console.log('执行后台同步任务');
          event.waitUntil(
            // 执行保活操作
            self.clients.matchAll().then((clients) => {
              if (clients.length === 0) {
                // 没有活动客户端，尝试唤醒
                return self.registration.showNotification('警告应用', {
                  body: '警告系统需要您的注意',
                  icon: '/icon.png',
                  vibrate: [200, 100, 200],
                  tag: 'warning-notification'
                });
              }
            })
          );
        }
      });
      
      // 周期性同步
      self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'warning-periodic-sync') {
          console.log('执行周期性同步任务');
          event.waitUntil(
            // 执行保活操作
            self.clients.matchAll().then((clients) => {
              if (clients.length === 0) {
                // 没有活动客户端，尝试唤醒
                return self.registration.showNotification('警告应用', {
                  body: '警告系统正在后台运行',
                  icon: '/icon.png',
                  silent: true,
                  tag: 'warning-periodic-notification'
                });
              }
            })
          );
        }
      });
      
      // 推送消息
      self.addEventListener('push', (event) => {
        const data = event.data ? event.data.json() : {};
        console.log('收到推送消息', data);
        
        event.waitUntil(
          self.registration.showNotification(data.title || '警告应用', {
            body: data.body || '警告系统需要您的注意',
            icon: '/icon.png',
            vibrate: [200, 100, 200],
            tag: 'warning-push-notification'
          })
        );
      });
      
      // 通知点击
      self.addEventListener('notificationclick', (event) => {
        console.log('通知被点击', event.notification.tag);
        event.notification.close();
        
        event.waitUntil(
          self.clients.matchAll({ type: 'window' }).then((clientList) => {
            // 如果已有窗口，聚焦它
            for (const client of clientList) {
              if (client.url === '/' && 'focus' in client) {
                return client.focus();
              }
            }
            // 否则打开新窗口
            if (self.clients.openWindow) {
              return self.clients.openWindow('/');
            }
          })
        );
      });
      
      // 保持活动状态
      setInterval(() => {
        console.log('Service Worker 保活心跳', new Date().toISOString());
      }, 30000);
    `;
    
    // 创建Blob URL
    const blob = new Blob([swContent], { type: 'application/javascript' });
    this.swBlobUrl = URL.createObjectURL(blob);
    
    console.log('Service Worker脚本已创建');
  }
  
  // 注册Service Worker
  async registerServiceWorker() {
    if (!this.config.serviceWorkerEnabled || !this.swBlobUrl) return false;
    
    try {
      // 注册Service Worker
      this.swRegistration = await navigator.serviceWorker.register(this.swBlobUrl);
      console.log('Service Worker注册成功:', this.swRegistration.scope);
      
      // 等待Service Worker激活
      if (this.swRegistration.installing) {
        console.log('Service Worker正在安装...');
        const worker = this.swRegistration.installing;
        
        // 监听状态变化
        worker.addEventListener('statechange', () => {
          console.log('Service Worker状态变化:', worker.state);
          
          if (worker.state === 'activated') {
            console.log('Service Worker已激活');
            this.setupBackgroundSync();
          }
        });
      } else if (this.swRegistration.active) {
        console.log('Service Worker已激活');
        this.setupBackgroundSync();
      }
      
      return true;
    } catch (error) {
      console.error('Service Worker注册失败:', error);
      return false;
    }
  }
  
  // 设置后台同步
  async setupBackgroundSync() {
    if (!this.swRegistration || !this.config.periodicSyncEnabled) return false;
    
    try {
      // 注册后台同步
      await this.swRegistration.sync.register('warning-sync');
      console.log('后台同步注册成功');
      
      // 注册周期性同步
      if ('periodicSync' in this.swRegistration) {
        try {
          // 检查权限
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync'
          });
          
          if (status.state === 'granted') {
            // 注册周期性同步
            await this.swRegistration.periodicSync.register('warning-periodic-sync', {
              minInterval: 60 * 1000 // 最小间隔1分钟
            });
            console.log('周期性同步注册成功');
          } else {
            console.warn('周期性同步权限未授予:', status.state);
          }
        } catch (error) {
          console.error('周期性同步注册失败:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('后台同步设置失败:', error);
      return false;
    }
  }
  
  // 获取唤醒锁
  async acquireWakeLock() {
    if (!this.config.wakeLockEnabled || this.wakeLock) return false;
    
    try {
      // 获取屏幕唤醒锁
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('屏幕唤醒锁获取成功');
      
      // 监听唤醒锁释放
      this.wakeLock.addEventListener('release', () => {
        console.log('屏幕唤醒锁已释放');
        this.wakeLock = null;
        
        // 尝试重新获取
        if (this.isActive && document.visibilityState === 'visible') {
          console.log('尝试重新获取屏幕唤醒锁...');
          setTimeout(() => this.acquireWakeLock(), 1000);
        }
      });
      
      return true;
    } catch (error) {
      console.error('屏幕唤醒锁获取失败:', error);
      
      // 使用替代方案
      this.useWakeLockAlternative();
      
      return false;
    }
  }
  
  // 使用唤醒锁替代方案
  useWakeLockAlternative() {
    console.log('使用唤醒锁替代方案...');
    
    // 创建隐藏音频元素保持活动状态
    const audioElement = document.createElement('audio');
    audioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audioElement.loop = true;
    audioElement.volume = 0.001; // 几乎无声
    
    // 尝试播放
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('音频播放失败，无法使用此替代方案:', error);
      });
    }
    
    // 保存引用
    this.wakeLockAudio = audioElement;
  }
  
  // 释放唤醒锁
  async releaseWakeLock() {
    // 释放WakeLock API
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        console.log('屏幕唤醒锁已手动释放');
        this.wakeLock = null;
      } catch (error) {
        console.error('屏幕唤醒锁释放失败:', error);
      }
    }
    
    // 释放替代方案
    if (this.wakeLockAudio) {
      this.wakeLockAudio.pause();
      this.wakeLockAudio.src = '';
      this.wakeLockAudio = null;
      console.log('唤醒锁替代方案已释放');
    }
  }
  
  // 开始心跳
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    console.log('启动保活心跳...');
    
    // 设置心跳定时器
    this.heartbeatTimer = setInterval(() => {
      // 记录心跳时间
      const now = new Date().getTime();
      localStorage.setItem(`${this.config.storageKey}_heartbeat`, now);
      
      // 执行其他保活操作
      this.performKeepAliveActions();
      
      console.log('保活心跳:', new Date().toISOString());
    }, this.config.heartbeatInterval);
    
    return true;
  }
  
  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('保活心跳已停止');
    }
    
    return true;
  }
  
  // 执行保活操作
  performKeepAliveActions() {
    // 执行一些轻量级操作以保持活动状态
    
    // 1. 触发DOM操作
    const dummyDiv = document.createElement('div');
    dummyDiv.style.display = 'none';
    document.body.appendChild(dummyDiv);
    setTimeout(() => {
      document.body.removeChild(dummyDiv);
    }, 100);
    
    // 2. 执行一些计算
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += Math.random();
    }
    
    // 3. 本地存储操作
    const timestamp = new Date().getTime();
    localStorage.setItem(`${this.config.storageKey}_activity`, timestamp);
    
    // 4. 触发微任务
    Promise.resolve().then(() => {
      const endTime = new Date().getTime();
      const duration = endTime - timestamp;
      console.log(`保活操作耗时: ${duration}ms`);
    });
  }
  
  // 调整后台保活策略
  adjustBackgroundKeepAlive() {
    console.log('调整后台保活策略...');
    
    // 增加心跳频率
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        this.performKeepAliveActions();
      }, this.config.heartbeatInterval / 2); // 减半间隔，提高频率
    }
    
    // 启动后台任务
    if (!this.backgroundTaskTimer) {
      this.backgroundTaskTimer = setInterval(() => {
        console.log('执行后台保活任务:', new Date().toISOString());
        
        // 执行更多保活操作
        this.performBackgroundKeepAliveActions();
      }, this.config.backgroundTaskInterval);
    }
    
    // 启动可见性检查
    if (!this.visibilityCheckTimer) {
      this.visibilityCheckTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('页面恢复可见，恢复正常保活策略');
          this.startKeepAlive(); // 恢复正常保活
        }
      }, this.config.visibilityCheckInterval);
    }
  }
  
  // 执行后台保活操作
  performBackgroundKeepAliveActions() {
    // 1. 触发网络请求
    fetch(`data:text/plain,keepalive_${Date.now()}`)
      .then(() => console.log('保活网络请求成功'))
      .catch(error => console.warn('保活网络请求失败:', error));
    
    // 2. 使用Web Workers
    if (typeof Worker !== 'undefined' && !this.keepAliveWorker) {
      try {
        // 创建Worker脚本
        const workerScript = `
          // 保活Worker
          let counter = 0;
          setInterval(() => {
            counter++;
            self.postMessage({ type: 'keepalive', counter });
          }, 5000);
        `;
        
        // 创建Blob URL
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        // 创建Worker
        this.keepAliveWorker = new Worker(workerUrl);
        
        // 监听消息
        this.keepAliveWorker.onmessage = (event) => {
          console.log('收到Worker保活消息:', event.data);
        };
        
        console.log('保活Worker已启动');
      } catch (error) {
        console.error('保活Worker创建失败:', error);
      }
    }
    
    // 3. 使用Broadcast Channel
    if ('BroadcastChannel' in window && !this.keepAliveChannel) {
      this.keepAliveChannel = new BroadcastChannel('warning_keepalive');
      this.keepAliveChannel.postMessage({ type: 'ping', time: Date.now() });
      
      this.keepAliveChannel.onmessage = (event) => {
        console.log('收到广播通道消息:', event.data);
        
        if (event.data.type === 'ping') {
          this.keepAliveChannel.postMessage({ type: 'pong', time: Date.now() });
        }
      };
    }
  }
  
  // 调整电源保活策略
  adjustPowerKeepAlive(isCharging) {
    console.log(`设备${isCharging ? '正在充电' : '使用电池'}，调整保活策略...`);
    
    if (isCharging) {
      // 充电状态，可以更激进地保活
      this.config.heartbeatInterval = 5000; // 5秒
      this.config.backgroundTaskInterval = 10000; // 10秒
      
      // 重启心跳
      if (this.isActive) {
        this.stopHeartbeat();
        this.startHeartbeat();
      }
    } else {
      // 电池状态，更保守地保活
      this.config.heartbeatInterval = 15000; // 15秒
      this.config.backgroundTaskInterval = 30000; // 30秒
      
      // 重启心跳
      if (this.isActive) {
        this.stopHeartbeat();
        this.startHeartbeat();
      }
    }
  }
  
  // 保存状态
  saveState() {
    const state = {
      isActive: this.isActive,
      lastActive: new Date().getTime()
    };
    
    localStorage.setItem(`${this.config.storageKey}_state`, JSON.stringify(state));
  }
  
  // 恢复状态
  restoreState() {
    try {
      const stateJson = localStorage.getItem(`${this.config.storageKey}_state`);
      if (stateJson) {
        const state = JSON.parse(stateJson);
        
        // 如果之前是活动状态，并且最后活动时间在一定范围内，则恢复活动状态
        const now = new Date().getTime();
        const timeDiff = now - (state.lastActive || 0);
        
        if (state.isActive && timeDiff < 60000) { // 1分钟内
          console.log('恢复之前的活动状态');
          this.startKeepAlive();
        }
      }
    } catch (error) {
      console.error('状态恢复失败:', error);
    }
  }
  
  // 启动保活机制
  async startKeepAlive() {
    if (this.isActive) {
      console.log('保活机制已经启动，跳过重复启动');
      return this;
    }
    
    console.log('启动增强保活机制...');
    this.isActive = true;
    
    // 获取唤醒锁
    await this.acquireWakeLock();
    
    // 注册Service Worker
    await this.registerServiceWorker();
    
    // 启动心跳
    this.startHeartbeat();
    
    // 清理后台任务
    if (this.backgroundTaskTimer) {
      clearInterval(this.backgroundTaskTimer);
      this.backgroundTaskTimer = null;
    }
    
    // 清理可见性检查
    if (this.visibilityCheckTimer) {
      clearInterval(this.visibilityCheckTimer);
      this.visibilityCheckTimer = null;
    }
    
    // 保存状态
    this.saveState();
    
    return this;
  }
  
  // 停止保活机制
  async stopKeepAlive() {
    if (!this.isActive) {
      return this;
    }
    
    console.log('停止增强保活机制...');
    this.isActive = false;
    
    // 释放唤醒锁
    await this.releaseWakeLock();
    
    // 停止心跳
    this.stopHeartbeat();
    
    // 清理后台任务
    if (this.backgroundTaskTimer) {
      clearInterval(this.backgroundTaskTimer);
      this.backgroundTaskTimer = null;
    }
    
    // 清理可见性检查
    if (this.visibilityCheckTimer) {
      clearInterval(this.visibilityCheckTimer);
      this.visibilityCheckTimer = null;
    }
    
    // 清理Worker
    if (this.keepAliveWorker) {
      this.keepAliveWorker.terminate();
      this.keepAliveWorker = null;
    }
    
    // 清理广播通道
    if (this.keepAliveChannel) {
      this.keepAliveChannel.close();
      this.keepAliveChannel = null;
    }
    
    // 保存状态
    this.saveState();
    
    return this;
  }
}

// 导出增强保活管理器
window.EnhancedKeepAliveManager = EnhancedKeepAliveManager;
