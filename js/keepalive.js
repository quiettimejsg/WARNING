/**
 * WARNING 应用增强版 - AB保活与自动播放模块
 * 实现AB保活机制和应用启动时自动播放警报
 */

// AB保活机制实现
class KeepAliveManager {
  constructor() {
    // 保活配置
    this.config = {
      keepAliveInterval: 15000,     // 保活检查间隔 (毫秒)，减少为15秒提高频率
      storageKey: 'warning_alive',  // localStorage键名
      processA: 'process_a',        // 进程A标识
      processB: 'process_b',        // 进程B标识
      lastActiveKey: 'last_active', // 最后活动时间键名
      maxInactiveTime: 30000,       // 最大不活动时间 (毫秒)，减少为30秒提高敏感度
      useServiceWorker: true,       // 使用Service Worker增强保活
      useFocusEvents: true,         // 使用焦点事件增强保活
      usePeriodicSync: true,        // 使用周期性同步增强保活
      useWakeLock: true             // 使用WakeLock API防止设备休眠
    };
    
    // 初始化状态
    this.processId = Math.random().toString(36).substring(2, 9);
    this.isActive = false;
    this.keepAliveTimer = null;
    
    // 绑定方法
    this.checkAlive = this.checkAlive.bind(this);
    this.markActive = this.markActive.bind(this);
    this.startKeepAlive = this.startKeepAlive.bind(this);
    this.stopKeepAlive = this.stopKeepAlive.bind(this);
    
    // 页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.markActive();
        if (!this.isActive) {
          this.startKeepAlive();
        }
      }
    });
    
    // 页面关闭前保存状态
    window.addEventListener('beforeunload', () => {
      this.markActive();
    });
  }
  
  // 初始化保活机制
  init() {
    console.log('初始化AB保活机制...');
    this.startKeepAlive();
    return this;
  }
  
  // 获取当前时间戳
  getCurrentTime() {
    return new Date().getTime();
  }
  
  // 保存数据到localStorage
  saveData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  }
  
  // 从localStorage读取数据
  loadData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('读取数据失败:', e);
      return null;
    }
  }
  
  // 标记当前进程活动
  markActive() {
    const currentTime = this.getCurrentTime();
    const aliveData = this.loadData(this.config.storageKey) || {};
    
    // 更新当前进程状态
    aliveData[this.processId] = {
      lastActive: currentTime,
      isAlive: true
    };
    
    // 更新最后活动时间
    aliveData[this.config.lastActiveKey] = currentTime;
    
    // 保存状态
    this.saveData(this.config.storageKey, aliveData);
  }
  
  // 检查其他进程是否活动
  checkAlive() {
    const currentTime = this.getCurrentTime();
    const aliveData = this.loadData(this.config.storageKey) || {};
    const lastActiveTime = aliveData[this.config.lastActiveKey] || 0;
    
    // 如果最后活动时间超过最大不活动时间，则重新激活
    if (currentTime - lastActiveTime > this.config.maxInactiveTime) {
      console.log('检测到应用长时间不活动，重新激活');
      this.markActive();
      
      // 尝试重新加载页面以恢复状态
      if (document.visibilityState !== 'visible') {
        this.attemptReload();
      }
    } else {
      // 正常标记活动
      this.markActive();
    }
  }
  
  // 尝试重新加载页面
  attemptReload() {
    // 在实际应用中，这里可以使用更复杂的逻辑
    // 例如通过Service Worker或其他机制重新激活应用
    console.log('尝试重新激活应用...');
    
    // 保存重要状态
    const reloadAttempt = (this.loadData('reload_attempt') || 0) + 1;
    this.saveData('reload_attempt', reloadAttempt);
    
    // 限制重载次数，防止循环重载
    if (reloadAttempt < 5) {
      // 使用setTimeout避免立即重载导致的问题
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.warn('重载尝试次数过多，停止自动重载');
      this.saveData('reload_attempt', 0);
    }
  }
  
  // 启动保活机制
  startKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }
    
    this.isActive = true;
    this.markActive();
    
    // 定期检查活动状态
    this.keepAliveTimer = setInterval(this.checkAlive, this.config.keepAliveInterval);
    console.log('AB保活机制已启动');
    
    return this;
  }
  
  // 停止保活机制
  stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    
    this.isActive = false;
    console.log('AB保活机制已停止');
    
    return this;
  }
}

// 自动播放管理器
class AutoPlayManager {
  constructor(alarmController) {
    // 自动播放配置
    this.config = {
      autoPlayOnStart: true,        // 启动时自动播放
      autoPlayDelay: 500,           // 自动播放延迟 (毫秒)
      autoPlayKey: 'auto_play',     // 自动播放设置键名
      lastPlayedKey: 'last_played'  // 最后播放时间键名
    };
    
    // 警报控制器引用
    this.alarmController = alarmController;
    
    // 绑定方法
    this.checkAutoPlay = this.checkAutoPlay.bind(this);
    this.enableAutoPlay = this.enableAutoPlay.bind(this);
    this.disableAutoPlay = this.disableAutoPlay.bind(this);
    this.toggleAutoPlay = this.toggleAutoPlay.bind(this);
  }
  
  // 初始化自动播放
  init() {
    console.log('初始化自动播放管理器...');
    
    // 检查是否启用自动播放
    const autoPlayEnabled = this.loadData(this.config.autoPlayKey);
    this.config.autoPlayOnStart = autoPlayEnabled !== null ? autoPlayEnabled : this.config.autoPlayOnStart;
    
    // 页面加载完成后检查自动播放
    if (document.readyState === 'complete') {
      this.checkAutoPlay();
    } else {
      window.addEventListener('load', this.checkAutoPlay);
    }
    
    return this;
  }
  
  // 保存数据到localStorage
  saveData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  }
  
  // 从localStorage读取数据
  loadData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('读取数据失败:', e);
      return null;
    }
  }
  
  // 检查是否需要自动播放
  checkAutoPlay() {
    if (!this.alarmController) {
      console.error('警报控制器未初始化，无法自动播放');
      return;
    }
    
    // 检查是否启用自动播放
    if (this.config.autoPlayOnStart) {
      console.log('自动播放已启用，准备播放警报...');
      
      // 延迟播放，确保页面和音频上下文已完全加载
      setTimeout(() => {
        // 检查页面可见性，仅在页面可见时播放
        if (document.visibilityState === 'visible') {
          this.alarmController.playAlarm();
          this.saveData(this.config.lastPlayedKey, new Date().getTime());
          console.log('警报已自动播放');
        } else {
          console.log('页面不可见，暂不自动播放警报');
          
          // 添加可见性变化监听，页面变为可见时播放
          const visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
              this.alarmController.playAlarm();
              this.saveData(this.config.lastPlayedKey, new Date().getTime());
              console.log('页面变为可见，警报已自动播放');
              document.removeEventListener('visibilitychange', visibilityHandler);
            }
          };
          
          document.addEventListener('visibilitychange', visibilityHandler);
        }
      }, this.config.autoPlayDelay);
    } else {
      console.log('自动播放已禁用，跳过自动播放');
    }
  }
  
  // 启用自动播放
  enableAutoPlay() {
    this.config.autoPlayOnStart = true;
    this.saveData(this.config.autoPlayKey, true);
    console.log('自动播放已启用');
    return this;
  }
  
  // 禁用自动播放
  disableAutoPlay() {
    this.config.autoPlayOnStart = false;
    this.saveData(this.config.autoPlayKey, false);
    console.log('自动播放已禁用');
    return this;
  }
  
  // 切换自动播放状态
  toggleAutoPlay() {
    if (this.config.autoPlayOnStart) {
      this.disableAutoPlay();
    } else {
      this.enableAutoPlay();
    }
    return this.config.autoPlayOnStart;
  }
}

// 导出模块
window.KeepAliveManager = KeepAliveManager;
window.AutoPlayManager = AutoPlayManager;
