/**
 * 设备检测服务 - 处理设备识别和位置变化检测
 */
export class DeviceDetectionService {
  /**
   * 提取设备信息
   * @param {Object} req Express请求对象
   * @returns {Object} 设备信息
   */
  extractDeviceInfo(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.ip || 
               req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = req.body.deviceInfo || userAgent;
    const fingerprint = req.body.fingerprint;

    return {
      ip: ip.trim(),
      userAgent,
      deviceInfo,
      fingerprint,
      deviceKey: deviceInfo || fingerprint || userAgent
    };
  }

  /**
   * 分析设备和位置变化
   * @param {Object} deviceInfo 当前设备信息
   * @param {Object} location 当前位置信息
   * @param {Array} loginHistory 登录历史
   * @returns {Object} 分析结果
   */
  analyzeDeviceAndLocation(deviceInfo, location, loginHistory) {
    const { deviceKey, fingerprint, userAgent, ip } = deviceInfo;
    
    if (!deviceKey || loginHistory.length === 0) {
      return {
        isNewDevice: !!deviceKey,
        isLocationChanged: false,
        isSameIp: false
      };
    }

    // 查找相同设备的历史记录
    const sameDeviceHistory = this._findSameDeviceHistory(
      loginHistory, 
      fingerprint, 
      userAgent
    );

    const isNewDevice = sameDeviceHistory.length === 0;
    let isSameIp = false;
    let isLocationChanged = false;

    if (!isNewDevice) {
      // 检查是否来自相同IP
      isSameIp = sameDeviceHistory.some(h => h.ip === ip);
      
      // 检查位置变化（仅在非同IP情况下）
      if (!isSameIp && location) {
        isLocationChanged = this._detectLocationChange(
          sameDeviceHistory[0], 
          location
        );
      }
    }

    return {
      isNewDevice,
      isLocationChanged,
      isSameIp
    };
  }

  /**
   * 生成设备描述
   * @param {string} userAgent 
   * @returns {string}
   */
  generateDeviceDescription(userAgent) {
    let deviceDesc = userAgent;
    
    try {
      // 检测浏览器
      if (/Chrome/i.test(userAgent)) deviceDesc = 'Chrome';
      else if (/Firefox/i.test(userAgent)) deviceDesc = 'Firefox';
      else if (/Safari/i.test(userAgent)) deviceDesc = 'Safari';
      else if (/Edge/i.test(userAgent)) deviceDesc = 'Edge';
      else if (/MSIE|Trident/i.test(userAgent)) deviceDesc = 'IE';
      else if (/Opera|OPR/i.test(userAgent)) deviceDesc = 'Opera';

      // 检测操作系统
      if (/Windows/i.test(userAgent)) deviceDesc += '（Windows）';
      else if (/Macintosh|Mac OS/i.test(userAgent)) deviceDesc += '（macOS）';
      else if (/Linux/i.test(userAgent)) deviceDesc += '（Linux）';
      else if (/Android/i.test(userAgent)) deviceDesc += '（Android）';
      else if (/iPhone|iPad|iOS/i.test(userAgent)) deviceDesc += '（iOS）';
    } catch (error) {
      console.warn('生成设备描述失败:', error);
    }

    return deviceDesc;
  }

  /**
   * 生成位置描述
   * @param {Object} location 
   * @returns {string}
   */
  generateLocationDescription(location) {
    if (!location) return '未知';
    
    const locationStr = [location.country, location.region, location.city]
      .filter(Boolean)
      .join(' ');
    
    return locationStr || '未知';
  }

  /**
   * 查找相同设备的历史记录
   * @param {Array} history 
   * @param {string} fingerprint 
   * @param {string} userAgent 
   * @returns {Array}
   * @private
   */
  _findSameDeviceHistory(history, fingerprint, userAgent) {
    return history.filter(h => {
      if (fingerprint && h.fingerprint) {
        return h.fingerprint === fingerprint;
      }
      return h.userAgent === userAgent;
    });
  }

  /**
   * 检测位置变化
   * @param {Object} lastRecord 
   * @param {Object} currentLocation 
   * @returns {boolean}
   * @private
   */
  _detectLocationChange(lastRecord, currentLocation) {
    if (!lastRecord?.location) return false;

    try {
      const lastLoc = typeof lastRecord.location === 'string' 
        ? JSON.parse(lastRecord.location) 
        : lastRecord.location;

      // 检查国家、地区、城市是否有变化
      const countryChanged = lastLoc.country && currentLocation.country && 
                           lastLoc.country !== currentLocation.country;
      const regionChanged = lastLoc.region && currentLocation.region && 
                          lastLoc.region !== currentLocation.region;
      const cityChanged = lastLoc.city && currentLocation.city && 
                        lastLoc.city !== currentLocation.city;

      return countryChanged || regionChanged || cityChanged;
    } catch (error) {
      console.warn('解析历史位置信息失败:', error);
      return false;
    }
  }
}