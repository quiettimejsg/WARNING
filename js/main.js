/**
 * WARNING 应用增强版 - 主控制模块
 * 整合所有功能，提供统一接口
 */

// 主控制器
class WarningController {
  constructor() {
    // 初始化状态
    this.initialized = false;
    this.alarmController = null;
    this.keepAliveManager = null;
    this.autoPlayManager = null;
    this.deviceController = null;
    this.enhancedKeepAliveManager = null;
    this.autoRestartManager = null;
    
    // 绑定方法
    this.init = this.init.bind(this);
    this.toggleAlarm = this.toggleAlarm.bind(this);
    this.toggleAutoPlay = this.toggleAutoPlay.bind(this);
    this.toggleFlashlight = this.toggleFlashlight.bind(this);
  }
  
  // 初始化应用
  async init() {
    if (this.initialized) {
      console.warn('警告控制器已初始化，跳过重复初始化');
      return this;
    }
    
    console.log('初始化警告控制器...');
    
    try {
      // 初始化警报控制器
      this.alarmController = new AlarmAudioController();
      
      // 初始化AB保活管理器
      this.keepAliveManager = new KeepAliveManager().init();
      
      // 初始化自动播放管理器
      this.autoPlayManager = new AutoPlayManager(this.alarmController).init();
      
      // 初始化设备控制管理器
      this.deviceController = await new DeviceControlManager().init();
      
      // 初始化增强保活管理器
      this.enhancedKeepAliveManager = await new EnhancedKeepAliveManager().init();
      
      // 初始化自动重启管理器
      this.autoRestartManager = await new AutoRestartManager().init();
      
      // 添加UI元素
      this.setupUI();
      
      // 添加事件监听
      this.setupEventListeners();
      
      // 启动增强保活
      this.enhancedKeepAliveManager.startKeepAlive();
      
      // 自动最大化音量
      if (this.deviceController) {
        this.deviceController.maximizeVolume();
      }
      
      this.initialized = true;
      console.log('警告控制器初始化完成');
    } catch (error) {
      console.error('警告控制器初始化失败:', error);
    }
    
    return this;
  }
  
  // 设置UI元素
  setupUI() {
    // 添加闪烁背景
    const flashBackground = document.createElement('div');
    flashBackground.className = 'flash-background';
    document.body.appendChild(flashBackground);
    
    // 添加警告图标
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
      const warningIcon = document.createElement('div');
      warningIcon.className = 'warning-icon';
      warningIcon.innerHTML = '⚠️';
      contentContainer.insertBefore(warningIcon, contentContainer.firstChild);
    }
  }
  
  // 设置事件监听
  setupEventListeners() {
    // 点击内容容器切换警报
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
      contentContainer.addEventListener('click', () => {
        this.toggleAlarm();
        
        // 警报开启时自动启动手电筒闪烁和最大化音量
        if (this.alarmController.isPlaying) {
          // 启动手电筒闪烁
          if (this.deviceController) {
            this.deviceController.startFlashlight();
          }
          
          // 最大化音量
          if (this.deviceController) {
            this.deviceController.maximizeVolume();
          }
        } else {
          // 停止手电筒闪烁
          if (this.deviceController) {
            this.deviceController.stopFlashlight();
          }
        }
      });
    }
    
    // 页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
      // 如果页面变为可见且自动播放已启用，播放警报
      if (document.visibilityState === 'visible' && 
          this.autoPlayManager && 
          this.autoPlayManager.config.autoPlayOnStart && 
          this.alarmController && 
          !this.alarmController.isPlaying) {
        this.alarmController.playAlarm();
        
        // 自动启动手电筒闪烁和最大化音量
        if (this.deviceController) {
          this.deviceController.startFlashlight();
          this.deviceController.maximizeVolume();
        }
      }
    });
  }
  
  // 切换警报声音
  toggleAlarm() {
    if (!this.alarmController) return false;
    
    if (this.alarmController.isPlaying) {
      return this.alarmController.stopAlarm();
    } else {
      return this.alarmController.playAlarm();
    }
  }
  
  // 切换自动播放设置
  toggleAutoPlay() {
    if (!this.autoPlayManager) return false;
    
    return this.autoPlayManager.toggleAutoPlay();
  }
  
  // 切换手电筒状态
  toggleFlashlight() {
    if (!this.deviceController) return false;
    
    return this.deviceController.toggleFlashlight();
  }
}

// 导出警告控制器
window.WarningController = WarningController;
