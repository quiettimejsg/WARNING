/**
 * WARNING 应用增强版 - 警报控制模块
 * 提高警报声音震慑力，实现更高级的音频控制
 */

// 音频上下文和音源管理
class AlarmAudioController {
  constructor() {
    // 创建音频上下文
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.alarmSound = null;
    this.alarmSoundBuffer = null;
    this.audioSource = null;
    
    // 警报参数配置
    this.config = {
      frequency: 1000,      // 基础频率 (Hz)
      volume: 1.0,          // 音量 (0-1)
      pulseSpeed: 1.5,      // 脉冲速度 (秒)
      pulseGap: 0.6,        // 脉冲间隔 (秒)
      useCustomSound: true  // 是否使用自定义音频
    };
    
    // 初始化音频上下文
    this.initAudioContext();
    
    // 加载自定义警报音效
    if (this.config.useCustomSound) {
      this.loadAlarmSound('/audio/warning_siren.mp3');
    }
  }
  
  // 初始化音频上下文
  initAudioContext() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      console.log('音频上下文初始化成功');
    } catch (e) {
      console.error('无法创建音频上下文:', e);
      // 降级处理
      this.config.useCustomSound = false;
    }
  }
  
  // 加载自定义警报音效
  loadAlarmSound(url) {
    // 创建绝对URL
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const absoluteUrl = new URL(url, baseUrl).href;
    
    fetch(absoluteUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.alarmSoundBuffer = audioBuffer;
        console.log('警报音效加载成功');
      })
      .catch(error => {
        console.error('警报音效加载失败:', error);
        // 降级到合成音效
        this.config.useCustomSound = false;
      });
  }
  
  // 创建合成警报音效
  createSyntheticAlarm() {
    // 创建振荡器
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sawtooth'; // 锯齿波提供更刺耳的警报音
    this.oscillator.frequency.setValueAtTime(this.config.frequency, this.audioContext.currentTime);
    
    // 创建增益节点控制音量
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(this.config.volume, this.audioContext.currentTime);
    
    // 连接节点
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    return this.oscillator;
  }
  
  // 播放自定义警报音效
  playCustomAlarm() {
    if (!this.alarmSoundBuffer) {
      console.warn('警报音效未加载，使用合成音效替代');
      return this.playSyntheticAlarm();
    }
    
    // 创建音频源
    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = this.alarmSoundBuffer;
    this.audioSource.loop = true;
    
    // 创建增益节点
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.config.volume, this.audioContext.currentTime);
    
    // 连接节点
    this.audioSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // 开始播放
    this.audioSource.start();
    this.isPlaying = true;
    
    return this.audioSource;
  }
  
  // 播放合成警报音效
  playSyntheticAlarm() {
    const oscillator = this.createSyntheticAlarm();
    oscillator.start();
    this.isPlaying = true;
    
    // 设置频率调制以增加紧迫感
    this.modulateFrequency();
    
    return oscillator;
  }
  
  // 调制频率以增加紧迫感
  modulateFrequency() {
    if (!this.oscillator) return;
    
    const now = this.audioContext.currentTime;
    
    // 在800Hz和1200Hz之间调制频率
    this.oscillator.frequency.setValueAtTime(800, now);
    this.oscillator.frequency.linearRampToValueAtTime(1200, now + 0.5);
    this.oscillator.frequency.linearRampToValueAtTime(800, now + 1.0);
    
    // 继续调制
    if (this.isPlaying) {
      setTimeout(() => this.modulateFrequency(), 1000);
    }
  }
  
  // 停止警报音效
  stopAlarm() {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource = null;
    }
    
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    
    this.isPlaying = false;
  }
  
  // 播放警报音效
  playAlarm() {
    // 如果已经在播放，先停止
    if (this.isPlaying) {
      this.stopAlarm();
    }
    
    // 恢复音频上下文（如果被暂停）
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // 根据配置选择播放方式
    if (this.config.useCustomSound && this.alarmSoundBuffer) {
      this.playCustomAlarm();
    } else {
      this.playSyntheticAlarm();
    }
  }
  
  // 切换警报音效开关
  toggleAlarm() {
    if (this.isPlaying) {
      this.stopAlarm();
    } else {
      this.playAlarm();
    }
    return this.isPlaying;
  }
}

// 导出警报控制器
window.AlarmAudioController = AlarmAudioController;
