/**
 * WebAuthn 凭据服务
 * 提供 WebAuthn 凭据的数据库操作功能
 */
import { smartQuery, smartConnect } from '../db/index.js';

/**
 * 保存新的 WebAuthn 凭据
 * @param {Object} credentialData 凭据数据
 * @returns {Promise<Object>}
 */
export async function saveCredential(credentialData) {
  const {
    userId,
    credentialId,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
    transports,
    name
  } = credentialData;

  try {
    const result = await smartQuery(
      `INSERT INTO webauthn_credentials 
       (user_id, credential_id, credential_public_key, counter, 
        credential_device_type, credential_backed_up, transports, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        credentialId,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports,
        name
      ]
    );

    console.log(`[WebAuthnCredentialService] 凭据保存成功: ${credentialId} for user ${userId}`);
    return result.rows[0];

  } catch (error) {
    console.error('[WebAuthnCredentialService] 保存凭据失败:', error);
    throw new Error('保存凭据失败');
  }
}

/**
 * 根据用户ID获取所有凭据
 * @param {string} userId 用户ID
 * @returns {Promise<Array>}
 */
export async function getCredentialsByUserId(userId) {
  try {
    const result = await smartQuery(
      `SELECT * FROM webauthn_credentials 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 获取用户凭据失败:', error);
    throw new Error('获取用户凭据失败');
  }
}

/**
 * 根据凭据ID获取凭据
 * @param {string} credentialId 凭据ID
 * @returns {Promise<Object|null>}
 */
export async function getCredentialById(credentialId) {
  try {
    const result = await smartQuery(
      `SELECT * FROM webauthn_credentials 
       WHERE credential_id = $1`,
      [credentialId]
    );

    return result.rows[0] || null;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 获取凭据失败:', error);
    throw new Error('获取凭据失败');
  }
}

/**
 * 更新凭据的计数器
 * @param {string} credentialId 凭据ID
 * @param {number} newCounter 新的计数器值
 * @returns {Promise<boolean>}
 */
export async function updateCredentialCounter(credentialId, newCounter) {
  try {
    const result = await smartQuery(
      `UPDATE webauthn_credentials 
       SET counter = $1, last_used_at = CURRENT_TIMESTAMP 
       WHERE credential_id = $2`,
      [newCounter, credentialId]
    );

    return result.rowCount > 0;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 更新凭据计数器失败:', error);
    throw new Error('更新凭据计数器失败');
  }
}

/**
 * 删除凭据
 * @param {string} credentialId 凭据ID
 * @param {string} userId 用户ID（用于权限验证）
 * @returns {Promise<boolean>}
 */
export async function deleteCredential(credentialId, userId) {
  try {
    const result = await smartQuery(
      `DELETE FROM webauthn_credentials 
       WHERE credential_id = $1 AND user_id = $2`,
      [credentialId, userId]
    );

    if (result.rowCount > 0) {
      console.log(`[WebAuthnCredentialService] 凭据删除成功: ${credentialId}`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 删除凭据失败:', error);
    throw new Error('删除凭据失败');
  }
}

/**
 * 更新凭据名称
 * @param {string} credentialId 凭据ID
 * @param {string} userId 用户ID（用于权限验证）
 * @param {string} newName 新名称
 * @returns {Promise<boolean>}
 */
export async function updateCredentialName(credentialId, userId, newName) {
  try {
    const result = await smartQuery(
      `UPDATE webauthn_credentials 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE credential_id = $2 AND user_id = $3`,
      [newName, credentialId, userId]
    );

    return result.rowCount > 0;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 更新凭据名称失败:', error);
    throw new Error('更新凭据名称失败');
  }
}

/**
 * 检查用户是否有任何已注册的 WebAuthn 凭据
 * @param {string} userId 用户ID
 * @returns {Promise<boolean>}
 */
export async function hasCredentials(userId) {
  try {
    const result = await smartQuery(
      `SELECT COUNT(*) as count FROM webauthn_credentials 
       WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count) > 0;

  } catch (error) {
    console.error('[WebAuthnCredentialService] 检查用户凭据失败:', error);
    throw new Error('检查用户凭据失败');
  }
}