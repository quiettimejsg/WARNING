/**
 * WARNING 应用增强版 - 设备控制模块
 * 实现手电筒闪烁和音量最大化功能
 */

// 设备控制管理器
class DeviceControlManager {
  constructor() {
    // 设备控制配置
    this.config = {
      flashlightEnabled: true,       // 是否启用手电筒
      flashlightInterval: 500,       // 手电筒闪烁间隔 (毫秒)
      volumeMaxEnabled: true,        // 是否启用音量最大化
      permissionRetryDelay: 2000,    // 权限请求重试延迟 (毫秒)
      permissionRetryMax: 5,         // 最大权限请求重试次数
      useNativeFlashlight: true,     // 使用原生闪光灯API
      useScreenFlash: true,          // 使用屏幕闪烁作为备选
      useJavascriptBridge: true,     // 使用JavaScript桥接原生功能
      forceMaxVolume: true           // 强制使用最大音量
    };
    
    // 状态变量
    this.flashlightActive = false;
    this.flashlightTimer = null;
    this.flashlightStream = null;
    this.volumeMaxActive = false;
    this.originalVolume = null;
    this.permissionRetryCount = 0;
    this.screenFlashElement = null;
    this.volumeInterval = null;
    this.audioElements = [];
    
    // 绑定方法
    this.toggleFlashlight = this.toggleFlashlight.bind(this);
    this.toggleVolumeMax = this.toggleVolumeMax.bind(this);
    this.startFlashlight = this.startFlashlight.bind(this);
    this.stopFlashlight = this.stopFlashlight.bind(this);
    this.maximizeVolume = this.maximizeVolume.bind(this);
    this.restoreVolume = this.restoreVolume.bind(this);
  }
  
  // 初始化设备控制
  async init() {
    console.log('初始化设备控制管理器...');
    
    // 检查设备支持情况
    this.checkDeviceSupport();
    
    // 创建屏幕闪烁元素（作为手电筒的备选方案）
    if (this.config.useScreenFlash) {
      this.createScreenFlashElement();
    }
    
    // 检测WebView环境
    this.detectWebViewEnvironment();
    
    // 预先请求权限
    if (this.config.flashlightEnabled) {
      this.preRequestPermissions();
    }
    
    // 预加载音频文件
    this.preloadAudioFiles();
    
    return this;
  }
  
  // 检查设备支持情况
  checkDeviceSupport() {
    // 检查手电筒支持
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      console.log('设备支持摄像头访问，可能支持手电筒控制');
    } else {
      console.warn('设备不支持摄像头访问，将使用备选方案');
      this.config.useNativeFlashlight = false;
    }
    
    // 检查音频控制支持
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      console.log('设备支持音频上下文，可能支持音量控制');
    } else {
      console.warn('设备不支持音频上下文，将使用备选方案');
    }
    
    // 检查Android WebView桥接
    if (window.Android) {
      console.log('检测到Android WebView环境');
      this.config.useJavascriptBridge = true;
    } else {
      console.log('未检测到Android WebView桥接');
    }
  }
  
  // 检测WebView环境
  detectWebViewEnvironment() {
    // 检测是否在Android WebView中运行
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.indexOf('android') > -1;
    const isWebView = userAgent.indexOf('wv') > -1 || 
                     userAgent.indexOf('webview') > -1;
    
    if (isAndroid && isWebView) {
      console.log('检测到Android WebView环境');
      
      // 尝试注入桥接接口
      this.injectWebViewBridge();
    }
    
    // 检测是否在iOS WebView中运行
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isIOSWebView = isIOS && !window.navigator.standalone && 
                        !/safari/.test(userAgent);
    
    if (isIOS && isIOSWebView) {
      console.log('检测到iOS WebView环境');
    }
  }
  
  // 注入WebView桥接接口
  injectWebViewBridge() {
    // 创建Android桥接
    if (!window.Android) {
      window.Android = {};
      
      // 添加闪光灯控制方法
      window.Android.toggleFlashlight = (enable) => {
        console.log(`尝试通过桥接控制闪光灯: ${enable ? '开启' : '关闭'}`);
        // 实际方法需要在原生端实现
        return true;
      };
      
      // 添加音量控制方法
      window.Android.setMaxVolume = () => {
        console.log('尝试通过桥接设置最大音量');
        // 实际方法需要在原生端实现
        return true;
      };
      
      // 添加自启动方法
      window.Android.enableAutoRestart = () => {
        console.log('尝试通过桥接启用自动重启');
        // 实际方法需要在原生端实现
        return true;
      };
      
      console.log('已创建Android桥接接口');
    }
    
    // 创建与原生代码通信的事件
    document.addEventListener('WebViewBridgeReady', (event) => {
      console.log('WebView桥接已就绪:', event.detail);
    });
    
    // 触发自定义事件，通知原生代码
    const bridgeEvent = new CustomEvent('WebViewJSReady', { 
      detail: { version: '1.0' } 
    });
    document.dispatchEvent(bridgeEvent);
  }
  
  // 预先请求权限
  async preRequestPermissions() {
    try {
      // 尝试预先获取摄像头权限
      if (this.config.useNativeFlashlight) {
        console.log('预先请求摄像头权限...');
        const stream = await this.requestCameraPermission();
        
        if (stream) {
          // 保存流以便后续使用
          this.flashlightStream = stream;
          console.log('摄像头权限预先获取成功');
          
          // 测试闪光灯功能
          this.testFlashlightCapability();
        }
      }
    } catch (error) {
      console.warn('预先请求权限失败:', error);
    }
  }
  
  // 预加载音频文件
  preloadAudioFiles() {
    try {
      // 预加载警报音效
      const audioFiles = ['warning_siren.mp3'];
      
      audioFiles.forEach(file => {
        const audio = new Audio(`audio/${file}`);
        audio.preload = 'auto';
        audio.volume = 1.0;
        
        // 静音加载以避免意外播放
        audio.muted = true;
        
        // 尝试加载
        audio.load();
        
        // 保存引用
        this.audioElements.push(audio);
        
        console.log(`预加载音频文件: ${file}`);
      });
    } catch (error) {
      console.warn('预加载音频文件失败:', error);
    }
  }
  
  // 测试闪光灯功能
  async testFlashlightCapability() {
    try {
      // 快速测试闪光灯开关
      const turnOnResult = await this.controlFlashlight(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const turnOffResult = await this.controlFlashlight(false);
      
      if (turnOnResult && turnOffResult) {
        console.log('闪光灯功能测试成功');
      } else {
        console.warn('闪光灯功能测试失败，将使用备选方案');
        this.config.useNativeFlashlight = false;
      }
    } catch (error) {
      console.warn('闪光灯功能测试失败:', error);
      this.config.useNativeFlashlight = false;
    }
  }
  
  // 创建屏幕闪烁元素
  createScreenFlashElement() {
    // 创建全屏闪烁元素
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.width = '100%';
    flashElement.style.height = '100%';
    flashElement.style.backgroundColor = '#FFFFFF';
    flashElement.style.zIndex = '9999';
    flashElement.style.display = 'none';
    flashElement.style.pointerEvents = 'none'; // 不阻止点击事件
    
    // 添加到文档
    document.body.appendChild(flashElement);
    
    // 保存引用
    this.screenFlashElement = flashElement;
    console.log('屏幕闪烁元素已创建');
  }
  
  // 请求摄像头权限（用于手电筒控制）
  async requestCameraPermission() {
    try {
      // 请求摄像头权限，优先使用后置摄像头（通常带闪光灯）
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // 优先后置摄像头
          width: { ideal: 1 },  // 最小分辨率以节省资源
          height: { ideal: 1 }
        }
      };
      
      // 在某些设备上，可能需要更明确的约束
      if (navigator.userAgent.toLowerCase().indexOf('android') > -1) {
        constraints.video.facingMode = 'environment'; // 强制使用后置摄像头
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('摄像头权限获取成功');
      return stream;
    } catch (error) {
      console.error('摄像头权限获取失败:', error);
      
      // 重试逻辑
      if (this.permissionRetryCount < this.config.permissionRetryMax) {
        this.permissionRetryCount++;
        console.log(`尝试重新获取权限 (${this.permissionRetryCount}/${this.config.permissionRetryMax})...`);
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            const retryStream = await this.requestCameraPermission();
            resolve(retryStream);
          }, this.config.permissionRetryDelay);
        });
      }
      
      return null;
    }
  }
  
  // 控制手电筒（闪光灯）
  async controlFlashlight(enable) {
    // 1. 尝试使用JavaScript桥接（WebView原生功能）
    if (this.config.useJavascriptBridge && window.Android && window.Android.toggleFlashlight) {
      try {
        const result = window.Android.toggleFlashlight(enable);
        if (result) {
          console.log(`通过JavaScript桥接${enable ? '开启' : '关闭'}闪光灯成功`);
          return true;
        }
      } catch (error) {
        console.warn('JavaScript桥接控制闪光灯失败:', error);
      }
    }
    
    // 2. 尝试使用Web API控制闪光灯
    if (this.config.useNativeFlashlight) {
      try {
        // 如果没有摄像头流，先获取权限
        if (!this.flashlightStream) {
          this.flashlightStream = await this.requestCameraPermission();
          if (!this.flashlightStream) {
            throw new Error('无法获取摄像头权限');
          }
        }
        
        // 获取视频轨道
        const videoTrack = this.flashlightStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error('无法获取视频轨道');
        }
        
        // 检查是否支持闪光灯控制
        const capabilities = videoTrack.getCapabilities();
        if (!capabilities || !capabilities.torch) {
          throw new Error('设备不支持闪光灯控制');
        }
        
        // 控制闪光灯
        await videoTrack.applyConstraints({
          advanced: [{ torch: enable }]
        });
        
        console.log(`Web API ${enable ? '开启' : '关闭'}闪光灯成功`);
        return true;
      } catch (error) {
        console.error('Web API控制闪光灯失败:', error);
        
        // 如果失败，标记为不可用，后续使用备选方案
        this.config.useNativeFlashlight = false;
      }
    }
    
    // 3. 尝试使用屏幕闪烁作为备选方案
    if (this.config.useScreenFlash && this.screenFlashElement) {
      try {
        this.screenFlashElement.style.display = enable ? 'block' : 'none';
        console.log(`屏幕闪烁${enable ? '开启' : '关闭'}成功`);
        return true;
      } catch (error) {
        console.error('屏幕闪烁控制失败:', error);
      }
    }
    
    // 所有方法都失败
    console.warn('所有闪光灯控制方法均失败');
    return false;
  }
  
  // 开始闪烁手电筒
  async startFlashlight() {
    if (!this.config.flashlightEnabled || this.flashlightActive) {
      return false;
    }
    
    console.log('开始闪烁手电筒...');
    this.flashlightActive = true;
    
    // 闪烁逻辑
    let isOn = false;
    
    const flashFunc = async () => {
      if (!this.flashlightActive) return;
      
      isOn = !isOn;
      await this.controlFlashlight(isOn);
      
      // 继续闪烁
      this.flashlightTimer = setTimeout(flashFunc, this.config.flashlightInterval);
    };
    
    // 开始闪烁
    flashFunc();
    
    return true;
  }
  
  // 停止闪烁手电筒
  async stopFlashlight() {
    if (!this.flashlightActive) {
      return false;
    }
    
    console.log('停止闪烁手电筒...');
    this.flashlightActive = false;
    
    // 清除定时器
    if (this.flashlightTimer) {
      clearTimeout(this.flashlightTimer);
      this.flashlightTimer = null;
    }
    
    // 确保关闭闪光灯
    await this.controlFlashlight(false);
    
    // 关闭屏幕闪烁
    if (this.screenFlashElement) {
      this.screenFlashElement.style.display = 'none';
    }
    
    // 释放摄像头资源
    if (this.flashlightStream) {
      this.flashlightStream.getTracks().forEach(track => track.stop());
      this.flashlightStream = null;
    }
    
    return true;
  }
  
  // 切换手电筒状态
  async toggleFlashlight() {
    if (this.flashlightActive) {
      return await this.stopFlashlight();
    } else {
      return await this.startFlashlight();
    }
  }
  
  // 最大化音量
  maximizeVolume() {
    if (!this.config.volumeMaxEnabled || this.volumeMaxActive) {
      return false;
    }
    
    try {
      console.log('尝试最大化音量...');
      
      // 方法1: 使用JavaScript桥接（WebView原生功能）
      if (this.config.useJavascriptBridge && window.Android && window.Android.setMaxVolume) {
        try {
          const result = window.Android.setMaxVolume();
          if (result) {
            console.log('通过JavaScript桥接最大化音量成功');
          }
        } catch (error) {
          console.warn('JavaScript桥接控制音量失败:', error);
        }
      }
      
      // 方法2: 使用HTMLMediaElement音量控制
      const mediaElements = document.querySelectorAll('audio, video');
      if (mediaElements.length > 0) {
        this.originalVolume = [];
        
        mediaElements.forEach((element, index) => {
          this.originalVolume[index] = element.volume;
          element.volume = 1.0; // 最大音量
        });
        
        // 创建隐藏的音频元素并播放静音音频以触发音量控制
        const silentAudio = document.createElement('audio');
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.volume = 1.0;
        silentAudio.autoplay = true;
        silentAudio.muted = true;
        document.body.appendChild(silentAudio);
        
        // 保存引用以便后续移除
        this.silentAudio = silentAudio;
      }
      
      // 方法3: 使用Web Audio API增益节点
      if (window.AudioContext || window.webkitAudioContext) {
        try {
          const context = window.audioContext || new (window.webkitAudioContext || window.AudioContext)();
          const gainNode = context.createGain();
          
          // 保存原始增益值
          if (!this.originalGain) {
            this.originalGain = gainNode.gain.value;
          }
          
          // 设置最大增益
          gainNode.gain.setValueAtTime(1.0, context.currentTime);
          
          // 连接到输出
          gainNode.connect(context.destination);
          
          // 保存引用
          this.gainNode = gainNode;
          this.audioContext = context;
        } catch (error) {
          console.warn('Web Audio API控制音量失败:', error);
        }
      }
      
      // 方法4: 尝试使用媒体会话API
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', () => {
            // 触发媒体会话可能会提示系统增加音量
            console.log('媒体会话播放触发');
          });
        } catch (error) {
          console.warn('媒体会话API控制失败:', error);
        }
      }
      
      // 方法5: 创建并播放一个短暂的音频以触发系统音量
      try {
        const triggerAudio = new Audio();
        triggerAudio.src = 'audio/warning_siren.mp3';
        triggerAudio.volume = 1.0;
        
        // 尝试播放以触发系统音量
        const playPromise = triggerAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('触发音频播放成功');
              // 短暂播放后暂停
              setTimeout(() => {
                triggerAudio.pause();
                triggerAudio.currentTime = 0;
              }, 100);
            })
            .catch(error => {
              console.warn('触发音频播放失败:', error);
            });
        }
      } catch (error) {
        console.warn('触发音频播放失败:', error);
      }
      
      // 方法6: 使用定期检查确保音量保持最大
      if (this.config.forceMaxVolume) {
        // 清除现有定时器
        if (this.volumeInterval) {
          clearInterval(this.volumeInterval);
        }
        
        // 设置定期检查
        this.volumeInterval = setInterval(() => {
          // 检查并确保所有媒体元素音量最大
          document.querySelectorAll('audio, video').forEach(element => {
            if (element.volume < 1.0) {
              element.volume = 1.0;
            }
          });
          
          // 尝试再次调用原生方法
          if (window.Android && window.Android.setMaxVolume) {
            window.Android.setMaxVolume();
          }
        }, 1000); // 每秒检查一次
      }
      
      this.volumeMaxActive = true;
      console.log('音量已最大化');
      
      return true;
    } catch (error) {
      console.error('音量最大化失败:', error);
      return false;
    }
  }
  
  // 恢复原始音量
  restoreVolume() {
    if (!this.volumeMaxActive) {
      return false;
    }
    
    try {
      console.log('尝试恢复原始音量...');
      
      // 方法1: 使用JavaScript桥接
      if (this.config.useJavascriptBridge && window.Android && window.Android.restoreVolume) {
        try {
          const result = window.Android.restoreVolume();
          if (result) {
            console.log('通过JavaScript桥接恢复音量成功');
          }
        } catch (error) {
          console.warn('JavaScript桥接恢复音量失败:', error);
        }
      }
      
      // 方法2: 恢复HTMLMediaElement音量
      const mediaElements = document.querySelectorAll('audio, video');
      if (mediaElements.length > 0 && Array.isArray(this.originalVolume)) {
        mediaElements.forEach((element, index) => {
          if (index < this.originalVolume.length) {
            element.volume = this.originalVolume[index];
          }
        });
      }
      
      // 移除静音音频元素
      if (this.silentAudio) {
        document.body.removeChild(this.silentAudio);
        this.silentAudio = null;
      }
      
      // 方法3: 恢复Web Audio API增益
      if (this.audioContext && this.gainNode && typeof this.originalGain === 'number') {
        this.gainNode.gain.setValueAtTime(this.originalGain, this.audioContext.currentTime);
        this.gainNode = null;
      }
      
      // 清除音量检查定时器
      if (this.volumeInterval) {
        clearInterval(this.volumeInterval);
        this.volumeInterval = null;
      }
      
      this.volumeMaxActive = false;
      this.originalVolume = null;
      this.originalGain = null;
      console.log('音量已恢复');
      
      return true;
    } catch (error) {
      console.error('音量恢复失败:', error);
      return false;
    }
  }
  
  // 切换音量状态
  toggleVolumeMax() {
    if (this.volumeMaxActive) {
      return this.restoreVolume();
    } else {
      return this.maximizeVolume();
    }
  }
}

// 导出设备控制管理器
window.DeviceControlManager = DeviceControlManager;
