/**
 * OAuth应用管理 API 路由
 * 提供OAuth2/OIDC应用的CRUD操作
 */
import express from 'express';
import { requireRole, ROLES } from '../../middlewares/permissions.js';
import { smartQuery, smartConnect } from '../../db/index.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * 生成客户端ID
 */
function generateClientId(appName) {
  const prefix = appName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 10);
  const suffix = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${suffix}`;
}

/**
 * 生成客户端密钥
 */
function generateClientSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 获取OAuth应用列表
 * GET /oauth/apps
 */
router.get('/', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const result = await smartQuery(`
      SELECT 
        id,
        name,
        description,
        client_id,
        client_secret,
        redirect_uris,
        scopes,
        app_type,
        is_active,
        created_at,
        updated_at,
        usage_count,
        issue_refresh_token
      FROM oauth_applications 
      ORDER BY created_at DESC
    `);

    const apps = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      redirectUris: JSON.parse(row.redirect_uris || '[]'),
      scopes: JSON.parse(row.scopes || '[]'),
      type: row.app_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usageCount: row.usage_count || 0,
      issueRefreshToken: row.issue_refresh_token
    }));

    res.json({
      success: true,
      data: { apps }
    });
  } catch (error) {
    console.error('[OAuth] 获取应用列表失败:', error);
    res.status(500).json({ 
      error: '获取应用列表失败' 
    });
  }
});

/**
 * 获取单个OAuth应用详情
 * GET /oauth/apps/:id
 */
router.get('/:id', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await smartQuery(`
      SELECT 
        id,
        name,
        description,
        client_id,
        client_secret,
        redirect_uris,
        scopes,
        app_type,
        is_active,
        created_at,
        updated_at,
        usage_count,
        issue_refresh_token
      FROM oauth_applications 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '应用不存在' 
      });
    }

    const row = result.rows[0];
    const app = {
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      redirectUris: JSON.parse(row.redirect_uris || '[]'),
      scopes: JSON.parse(row.scopes || '[]'),
      type: row.app_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usageCount: row.usage_count || 0,
      issueRefreshToken: row.issue_refresh_token
    };

    res.json({
      success: true,
      data: { app }
    });
  } catch (error) {
    console.error('[OAuth] 获取应用详情失败:', error);
    res.status(500).json({ 
      error: '获取应用详情失败' 
    });
  }
});

/**
 * 创建OAuth应用
 * POST /oauth/apps
 */
router.post('/', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { name, description, type, redirectUris, scopes, issueRefreshToken } = req.body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: '应用名称不能为空' 
      });
    }

    if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
      return res.status(400).json({ 
        error: '重定向URI不能为空' 
      });
    }

    // 验证重定向URI格式
    for (const uri of redirectUris) {
      try {
        new URL(uri);
      } catch {
        return res.status(400).json({ 
          error: `无效的重定向URI: ${uri}` 
        });
      }
    }

    // 验证应用类型
    const validTypes = ['web', 'mobile', 'desktop', 'server'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: '无效的应用类型' 
      });
    }

    // 验证权限范围
    const validScopes = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'];
    const scopeArray = Array.isArray(scopes) ? scopes : [];
    for (const scope of scopeArray) {
      if (!validScopes.includes(scope)) {
        return res.status(400).json({ 
          error: `无效的权限范围: ${scope}` 
        });
      }
    }

    // 确保包含必需的openid scope
    if (!scopeArray.includes('openid')) {
      scopeArray.unshift('openid');
    }

    // 生成客户端凭证
    const clientId = generateClientId(name);
    const clientSecret = generateClientSecret();

    // 插入数据库
    const result = await smartQuery(`
      INSERT INTO oauth_applications (
        name, 
        description, 
        client_id, 
        client_secret, 
        redirect_uris, 
        scopes, 
        app_type, 
        is_active,
        usage_count,
        issue_refresh_token,
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, created_at, updated_at
    `, [
      name.trim(),
      description?.trim() || '',
      clientId,
      clientSecret,
      JSON.stringify(redirectUris),
      JSON.stringify(scopeArray),
      type,
      true,
      0,
      Boolean(issueRefreshToken)
    ]);

    const newApp = {
      id: result.rows[0].id,
      name: name.trim(),
      description: description?.trim() || '',
      clientId,
      clientSecret,
      redirectUris,
      scopes: scopeArray,
      type,
      isActive: true,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      usageCount: 0,
      issueRefreshToken: Boolean(issueRefreshToken)
    };

    res.status(201).json({
      success: true,
      data: { app: newApp }
    });
  } catch (error) {
    console.error('[OAuth] 创建应用失败:', error);
    
    // 检查唯一约束违反
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: '应用名称已存在' 
      });
    }
    
    res.status(500).json({ 
      error: '创建应用失败' 
    });
  }
});

/**
 * 更新OAuth应用
 * PUT /oauth/apps/:id
 */
router.put('/:id', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, redirectUris, scopes, isActive, issueRefreshToken } = req.body;

    // 验证应用是否存在
    const existingApp = await smartQuery(
      'SELECT id FROM oauth_applications WHERE id = $1',
      [id]
    );

    if (existingApp.rows.length === 0) {
      return res.status(404).json({ 
        error: '应用不存在' 
      });
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${valueIndex++}`);
      updateValues.push(name.trim());
    }

    if (description !== undefined) {
      updateFields.push(`description = $${valueIndex++}`);
      updateValues.push(description?.trim() || '');
    }

    if (redirectUris !== undefined) {
      // 验证重定向URI
      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        return res.status(400).json({ 
          error: '重定向URI不能为空' 
        });
      }

      for (const uri of redirectUris) {
        try {
          new URL(uri);
        } catch {
          return res.status(400).json({ 
            error: `无效的重定向URI: ${uri}` 
          });
        }
      }

      updateFields.push(`redirect_uris = $${valueIndex++}`);
      updateValues.push(JSON.stringify(redirectUris));
    }

    if (scopes !== undefined) {
      // 验证权限范围
      const validScopes = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'];
      const scopeArray = Array.isArray(scopes) ? scopes : [];
      
      for (const scope of scopeArray) {
        if (!validScopes.includes(scope)) {
          return res.status(400).json({ 
            error: `无效的权限范围: ${scope}` 
          });
        }
      }

      // 确保包含必需的openid scope
      if (!scopeArray.includes('openid')) {
        scopeArray.unshift('openid');
      }

      updateFields.push(`scopes = $${valueIndex++}`);
      updateValues.push(JSON.stringify(scopeArray));
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${valueIndex++}`);
      updateValues.push(Boolean(isActive));
    }

    if (issueRefreshToken !== undefined) {
      updateFields.push(`issue_refresh_token = $${valueIndex++}`);
      updateValues.push(Boolean(issueRefreshToken));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: '没有提供要更新的字段' 
      });
    }

    // 添加updated_at和id
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    // 执行更新
    const result = await smartQuery(`
      UPDATE oauth_applications 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING 
        id, name, description, client_id, client_secret, 
        redirect_uris, scopes, app_type, is_active, 
        created_at, updated_at, usage_count, issue_refresh_token
    `, updateValues);

    const row = result.rows[0];
    const updatedApp = {
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      redirectUris: JSON.parse(row.redirect_uris || '[]'),
      scopes: JSON.parse(row.scopes || '[]'),
      type: row.app_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usageCount: row.usage_count || 0,
      issueRefreshToken: row.issue_refresh_token
    };

    res.json({
      success: true,
      data: { app: updatedApp }
    });
  } catch (error) {
    console.error('[OAuth] 更新应用失败:', error);
    res.status(500).json({ 
      error: '更新应用失败' 
    });
  }
});

/**
 * 删除OAuth应用
 * DELETE /oauth/apps/:id
 */
router.delete('/:id', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    // 删除应用
    const result = await smartQuery(
      'DELETE FROM oauth_applications WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '应用不存在' 
      });
    }

    res.json({
      success: true,
      message: '应用删除成功'
    });
  } catch (error) {
    console.error('[OAuth] 删除应用失败:', error);
    res.status(500).json({ 
      error: '删除应用失败' 
    });
  }
});

/**
 * 重新生成客户端密钥
 * POST /oauth/apps/:id/regenerate-secret
 */
router.post('/:id/regenerate-secret', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    // 生成新的客户端密钥
    const newClientSecret = generateClientSecret();

    // 更新数据库
    const result = await smartQuery(`
      UPDATE oauth_applications 
      SET 
        client_secret = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING client_secret
    `, [newClientSecret, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '应用不存在' 
      });
    }

    res.json({
      success: true,
      data: { 
        clientSecret: newClientSecret 
      }
    });
  } catch (error) {
    console.error('[OAuth] 重新生成密钥失败:', error);
    res.status(500).json({ 
      error: '重新生成密钥失败' 
    });
  }
});

export default router;