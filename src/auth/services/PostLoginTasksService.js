/**
 * 登录后任务服务 - 处理登录后的异步后台任务
 */
import { DeviceDetectionService } from './DeviceDetectionService.js';

export class PostLoginTasksService {
  constructor() {
    this.deviceDetectionService = new DeviceDetectionService();
  }

  /**
   * 执行登录后的所有后台任务
   * @param {Object} options 
   * @param {Object} options.req Express请求对象
   * @param {Object} options.user 用户信息
   * @param {string} options.loginType 登录类型：'No 2FA', 'TOTP', 'Backup Code'
   */
  async executePostLoginTasks({ req, user, loginType = 'Unknown' }) {
    const taskPrefix = `[LOGIN_ASYNC] User ${user.id} (${loginType})`;
    
    try {
      console.log(`${taskPrefix}: Starting post-login background tasks...`);
      
      // 1. 提取设备信息
      const deviceInfo = this.deviceDetectionService.extractDeviceInfo(req);
      
      // 2. 获取地理位置信息
      console.time(`${taskPrefix}: GeoIP Lookup`);
      const location = await this._getGeoLocation(deviceInfo.ip);
      console.timeEnd(`${taskPrefix}: GeoIP Lookup`);
      
      // 3. 获取登录历史
      console.time(`${taskPrefix}: Login History Query`);
      const history = await this._getLoginHistory(user.id);
      console.timeEnd(`${taskPrefix}: Login History Query`);
      
      // 4. 分析设备和位置变化
      const analysis = this.deviceDetectionService.analyzeDeviceAndLocation(
        deviceInfo, 
        location, 
        history
      );
      
      // 5. 发送安全提醒邮件（如果需要）
      if (this._shouldSendSecurityAlert(analysis)) {
        await this._sendSecurityAlert({
          user,
          deviceInfo,
          location,
          analysis,
          taskPrefix
        });
      }
      
      // 6. 记录登录历史
      console.time(`${taskPrefix}: Record Login History`);
      await this._recordLoginHistory({ req, user, location, deviceInfo });
      console.timeEnd(`${taskPrefix}: Record Login History`);
      
      console.log(`${taskPrefix}: Post-login background tasks completed.`);
      
    } catch (error) {
      console.error(`${taskPrefix}: Post-login background task failed:`, error);
    }
  }

  /**
   * 判断是否应该发送安全提醒
   * @param {Object} analysis 设备和位置分析结果
   * @returns {boolean}
   * @private
   */
  _shouldSendSecurityAlert(analysis) {
    const { isNewDevice, isLocationChanged, isSameIp } = analysis;
    return (isNewDevice || isLocationChanged) && !isSameIp;
  }

  /**
   * 发送安全提醒邮件
   * @param {Object} options
   * @private
   */
  async _sendSecurityAlert({ user, deviceInfo, location, analysis, taskPrefix }) {
    console.log(
      `${taskPrefix}: New device/location detected ` +
      `(isNewDevice: ${analysis.isNewDevice}, ` +
      `isLocationChanged: ${analysis.isLocationChanged}, ` +
      `isSameIp: ${analysis.isSameIp}). Sending alert email...`
    );

    const deviceDesc = this.deviceDetectionService.generateDeviceDescription(
      deviceInfo.userAgent
    );
    const locationStr = this.deviceDetectionService.generateLocationDescription(location);
    
    console.time(`${taskPrefix}: Send Login Alert Email`);
    
    const { sendLoginAlertEmail } = await import('../../mail/resend.js');
    await sendLoginAlertEmail(user.email, {
      loginTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      device: deviceDesc,
      ip: this._maskIp(deviceInfo.ip),
      location: locationStr
    });
    
    console.timeEnd(`${taskPrefix}: Send Login Alert Email`);
  }

  /**
   * 获取地理位置信息
   * @param {string} ip 
   * @returns {Promise<Object>}
   * @private
   */
  async _getGeoLocation(ip) {
    const { getGeoInfo } = await import('../../utils/geoip.js');
    return getGeoInfo(ip);
  }

  /**
   * 获取登录历史
   * @param {string} userId 
   * @returns {Promise<Array>}
   * @private
   */
  async _getLoginHistory(userId) {
    const { getLoginHistory } = await import('../../services/loginHistoryService.js');
    return getLoginHistory(userId, 20);
  }

  /**
   * 记录登录历史
   * @param {Object} options
   * @private
   */
  async _recordLoginHistory({ req, user, location, deviceInfo }) {
    const { recordLoginLog } = await import('../recordLoginLog.js');
    await recordLoginLog({ 
      req, 
      user, 
      success: true, 
      location, 
      fingerprint: deviceInfo.fingerprint 
    });
  }

  /**
   * 掩码IP地址
   * @param {string} ip 
   * @returns {string}
   * @private
   */
  _maskIp(ip) {
    if (!ip) return '';
    
    // IPv4
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      const parts = ip.split('.');
      let last = parts[3];
      if (last.length > 2) {
        last = last.slice(0, -2) + '**';
      } else if (last.length === 2) {
        last = '*' + last.slice(1);
      } else {
        last = '*';
      }
      return parts.slice(0, 3).join('.') + '.' + last;
    }
    
    // IPv6
    if (ip.includes(':')) {
      const segs = ip.split(':');
      return segs.slice(0, 3).join(':') + ':****:****';
    }
    
    return ip;
  }
}