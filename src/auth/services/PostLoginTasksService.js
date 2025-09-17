/**
 * 登录后任务服务 - 处理登录后的异步后台任务
 */

import { DeviceDetectionService } from './DeviceDetectionService.js';

// 简单日志门控（生产环境默认关闭详细日志）
const DEBUG =
  (process.env.NODE_ENV !== 'production' && process.env.DEBUG_LOGIN !== '0') ||
  process.env.DEBUG_LOGIN === '1';

function dlog(...args) {
  if (DEBUG) console.log(...args);
}
function dtimestart(label) {
  if (DEBUG) console.time(label);
}
function dtimeend(label) {
  if (DEBUG) console.timeEnd(label);
}

// 惰性导入缓存
let __geoipModPromise = null;
async function getGeoInfoFn() {
  if (!__geoipModPromise) {
    __geoipModPromise = import('../../utils/geoip.js');
  }
  const mod = await __geoipModPromise;
  return mod.getGeoInfo;
}

let __loginHistoryModPromise = null;
async function getLoginHistoryFn() {
  if (!__loginHistoryModPromise) {
    __loginHistoryModPromise = import('../../services/loginHistoryService.js');
  }
  const mod = await __loginHistoryModPromise;
  return mod.getLoginHistory;
}

let __resendModPromise = null;
async function getSendLoginAlertEmailFn() {
  if (!__resendModPromise) {
    __resendModPromise = import('../../mail/resend.js');
  }
  const mod = await __resendModPromise;
  return mod.sendLoginAlertEmail;
}

let __recordLoginLogModPromise = null;
async function getRecordLoginLogFn() {
  if (!__recordLoginLogModPromise) {
    __recordLoginLogModPromise = import('../recordLoginLog.js');
  }
  const mod = await __recordLoginLogModPromise;
  return mod.recordLoginLog;
}

export class PostLoginTasksService {
  constructor() {
    this.deviceDetectionService = new DeviceDetectionService();
  }

  /**
   * 执行登录后的所有后台任务
   * @param {Object} options
   * @param {Object} options.req Express请求对象（最小必要字段）
   * @param {Object} options.user 用户信息
   * @param {string} options.loginType 登录类型：'No 2FA', 'TOTP', 'Backup Code'
   */
  async executePostLoginTasks({ req, user, loginType = 'Unknown' }) {
    const taskPrefix = `[LOGIN_ASYNC] User ${user.id} (${loginType})`;

    try {
      dlog(`${taskPrefix}: Starting post-login background tasks...`);

      // 1) 提取设备信息
      const deviceInfo = this.deviceDetectionService.extractDeviceInfo(req);

      // 2) 并发：获取地理位置 与 登录历史（缩短占用时间）
      dtimestart(`${taskPrefix}: GeoIP+History`);
      const [location, history] = await Promise.all([
        (async () => {
          const getGeoInfo = await getGeoInfoFn();
          return getGeoInfo(deviceInfo.ip);
        })(),
        (async () => {
          const getLoginHistory = await getLoginHistoryFn();
          return getLoginHistory(user.id, 20);
        })()
      ]);
      dtimeend(`${taskPrefix}: GeoIP+History`);

      // 3) 分析设备与位置变化
      const analysis = this.deviceDetectionService.analyzeDeviceAndLocation(
        deviceInfo,
        location,
        history
      );

      // 4) 发送安全提醒（按策略）
      if (this._shouldSendSecurityAlert(analysis)) {
        await this._sendSecurityAlert({
          user,
          deviceInfo,
          location,
          analysis,
          taskPrefix
        });
      }

      // 5) 记录登录历史
      dtimestart(`${taskPrefix}: Record Login History`);
      const recordLoginLog = await getRecordLoginLogFn();
      await recordLoginLog({
        req,
        user,
        success: true,
        location,
        fingerprint: deviceInfo.fingerprint
      });
      dtimeend(`${taskPrefix}: Record Login History`);

      dlog(`${taskPrefix}: Post-login background tasks completed.`);
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
    dlog(
      `${taskPrefix}: New device/location detected (isNewDevice: ${analysis.isNewDevice}, isLocationChanged: ${analysis.isLocationChanged}, isSameIp: ${analysis.isSameIp}). Sending alert email...`
    );

    const deviceDesc = this.deviceDetectionService.generateDeviceDescription(
      deviceInfo.userAgent
    );
    const locationStr = this.deviceDetectionService.generateLocationDescription(location);

    dtimestart(`${taskPrefix}: Send Login Alert Email`);
    const sendLoginAlertEmail = await getSendLoginAlertEmailFn();
    await sendLoginAlertEmail(user.email, {
      loginTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      device: deviceDesc,
      ip: this._maskIp(deviceInfo.ip),
      location: locationStr
    });
    dtimeend(`${taskPrefix}: Send Login Alert Email`);
  }

  /**
   * 掩码 IP 地址（IPv4/IPv6）
   * @param {string} ip
   * @returns {string}
   * @private
   */
  _maskIp(ip) {
    if (!ip) return '';

    // IPv4
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      const parts = ip.split('.');
      const last = parts[3];
      // 用固定形态减少分支
      const masked =
        last.length >= 3 ? last.slice(0, -2) + '**' :
        last.length === 2 ? '*' + last.slice(1) : '*';
      return `${parts[0]}.${parts[1]}.${parts[2]}.${masked}`;
    }

    // IPv6（只保留前 3 段）
    if (ip.includes(':')) {
      const idx1 = ip.indexOf(':');
      const idx2 = ip.indexOf(':', idx1 + 1);
      const idx3 = ip.indexOf(':', idx2 + 1);
      const head = idx3 > 0 ? ip.slice(0, idx3) : ip;
      return `${head}:****:****`;
    }

    return ip;
  }
}
