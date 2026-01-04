/**
 * 中文语言包
 */

export const zh = {
  // 通用
  common: {
    save: '保存',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    close: '关闭',
    confirm: '确认',
    back: '返回',
    next: '下一步',
    create: '创建',
    add: '添加',
    enable: '启用',
    disable: '禁用',
    connect: '连接',
    upgrade: '升级',
    processing: '处理中...',
    saving: '保存中...',
    loading: '加载中...',
    copy: '复制',
    copied: '已复制',
    setup: '设置',
    manage: '管理',
    remove: '移除',
    set: '设置',
    change: '修改',
    linked: '已绑定',
  },

  // 导航
  nav: {
    account: '账户',
    security: '安全',
    sessions: '会话',
    user: '用户',
    oauth: 'OAuth',
    returnHome: '返回首页',
  },

  // 欢迎语
  welcome: {
    greeting: '欢迎，{name}。',
    subtitle: '管理您的账户。',
  },

  // 账户页
  account: {
    title: '您的账户',
    description: '管理您的账户信息。',
    fullName: '姓名',
    email: '邮箱',
    subscription: '订阅',
    manageSubscription: '管理您的订阅',
    accountCreated: '账户创建时间',
    editName: '编辑姓名',
    updateEmail: '更新邮箱',
    manage: '管理',
    language: '语言',
    languageDescription: '选择您的首选语言',
    notSet: '未设置',
    verified: '已验证',
    unverified: '未验证',
    password: '密码',
    passwordSet: '已设置密码',
    passwordNotSet: '未设置密码',
    freePlan: '免费版',
    linkedAccount: '已绑定',
    setPasswordHint: '设置密码以启用',

    // 登录方式
    signInMethods: '登录方式',
    signInMethodsDesc: '管理您的账户登录方式。',
    emailPassword: '邮箱和密码',
    emailPasswordDesc: '使用邮箱登录',
    connectAccount: '连接您的 {provider} 账户',
  },

  // 安全页
  security: {
    title: '账户安全',
    description: '管理您的账户安全设置。',
    addMfaDevice: '添加 MFA 设备',
    addMfaDesc: '选择验证器应用或使用设备内置的生物识别认证。',
    authenticatorApp: '验证器应用',
    biometricAuth: '生物识别认证',

    // 密码
    loginWithPassword: '密码登录',
    loginWithPasswordDesc: '管理您的账户密码。',
    setPassword: '设置密码',

    // MFA
    mfa: '多因素认证',
    mfaDesc: '使用验证器应用或生物识别认证添加额外的安全层。',
    setupMfa: '设置 MFA',

    // MFA 设备类型
    deviceTypeApp: '验证器应用',
    deviceTypeBiometric: '生物识别',
    deviceType: '类型',
    addedOn: '添加于',
    recoveryCodes: '恢复码',
    recoveryCodesDesc: '您需要至少启用一种多因素认证方式才能生成恢复码。',
    recoveryCodesExist: '您已生成恢复码。如需重新生成，旧的恢复码将失效。',
    recoveryCodesGenerate: '生成恢复码以便在无法使用 MFA 设备时恢复账户访问。',
    recoveryCodesHint: '请将这些恢复码保存在安全的地方。每个恢复码只能使用一次，关闭此窗口后将无法再次查看。',
    generateCodes: '生成恢复码',
    regenerateCodes: '重新生成',
    regenerateWarning: '重新生成恢复码将使所有现有恢复码失效。确定要继续吗？',
    mfaSetupComplete: '设置完成',
    authenticatorEnabled: '验证器应用已启用',
    biometricEnabled: '生物识别认证已启用',

    // 验证器应用
    scanQrCode: '使用验证器应用扫描',
    qrCodeHint: 'Google Authenticator、Microsoft Authenticator 或任何兼容 TOTP 的应用',
    enterCode: '输入 6 位验证码',
    verifyAndEnable: '验证并启用',

    // 生物识别
    addBiometric: '添加生物识别设备',
    setupBiometric: '设置生物识别认证',
    biometricDesc: '使用设备内置的生物识别认证进行安全登录',

    deviceName: '设备名称',
    deviceNamePlaceholder: '例如：iPhone 15、MacBook Pro',
    deviceNameHint: '选择一个名称以帮助您识别此设备',
    startBiometricSetup: '开始生物识别设置',
  },

  // 会话页
  sessions: {
    title: '您的会话',
    description: '管理您的活跃会话。',
    currentSession: '当前会话',
    activeSessions: '活跃会话',
    location: '位置',
    createdOn: '创建时间',
    expiresOn: '过期时间',
    ipAddress: 'IP 地址',
    timezone: '时区',
    signOutAll: '登出所有设备',
  },

  // 用户管理页
  users: {
    title: '用户管理',
    description: '管理系统用户和权限。',
    systemUsers: '系统用户',
    systemUsersDesc: '查看和管理所有系统用户',
    addUser: '添加用户',
    searchUsers: '搜索用户',
    email: '邮箱',
    name: '名称',
    role: '角色',
    status: '状态',
    created: '创建时间',
    emailVerified: '邮箱已验证',
    twoFactorEnabled: '已启用 2FA',
    biometricEnabled: '已启用生物识别',
    providers: '登录方式',

    // 角色
    roles: {
      user: '用户',
      admin: '管理员',
      super_admin: '超级管理员',
    },
  },

  // OAuth 页
  oauth: {
    title: 'OAuth 应用',
    description: '用于第三方集成的安全授权框架。',
    applications: '应用',
    applicationsDesc: '管理您的 OAuth 应用和凭证',
    searchApps: '搜索应用',
    application: '应用',
    clientId: '客户端 ID',
    clientSecret: '客户端密钥',
    usage: '使用次数',
    authorizations: '授权次数',
    viewGuide: '查看集成指南',

    // 创建应用
    createApp: '创建 OAuth 应用',
    createAppDesc: '为您的集成设置新的 OAuth 2.0 应用。',
    appName: '应用名称',
    appNamePlaceholder: '我的应用',
    appNameHint: '一个易于识别的应用名称',
    descriptionOptional: '描述（可选）',
    descriptionPlaceholder: '这个应用是做什么的？',
    descriptionHint: '简要描述您的应用用途',
    redirectUris: '重定向 URI',
    redirectUrisPlaceholder: 'https://example.com/callback',
    redirectUrisHint: '每行一个 URI。用户授权后将被重定向到这里。',

    // 权限
    permissions: '权限',
    permissionsDesc: '选择您的应用可以访问的信息',
    requiredScope: '必需',
    scopes: {
      openid: 'OpenID Connect',
      openidDesc: '基本身份认证',
      profile: '基本资料',
      profileDesc: '用户名、头像',
      email: '邮箱地址',
      emailDesc: '用户的邮箱地址',
      phone: '手机号码',
      phoneDesc: '用户的手机号码',
      address: '地址信息',
      addressDesc: '用户的地址信息',
      offline_access: '离线访问',
      offline_accessDesc: '发放 Refresh Token',
    },

    // 创建成功
    appCreated: '应用已创建',
    saveCredentials: '请安全保存您的凭证。客户端密钥不会再次显示。',
    documentation: '文档',
    integrationGuide: '集成指南',
    apiReference: 'API 参考',
    codeExamples: '代码示例',
    backToApps: '返回应用列表',
    createApplication: '创建应用',
  },

  // 文档
  docs: {
    title: '文档',
    description: '开发者指南和 API 参考。',
    comingSoon: '即将推出',
    needHelp: '需要帮助？',
    oauthGuide: 'OAuth 2.0 集成指南',
    oauthGuideDesc: '完整的 OAuth 2.0 和 OpenID Connect 认证服务集成文档。',
    securityGuide: '安全最佳实践',
    securityGuideDesc: '双因素认证、WebAuthn、会话管理',
    userApiGuide: '用户管理 API',
    userApiGuideDesc: '用户 CRUD、角色权限、批量操作',
    webhookGuide: 'Webhook 集成',
    webhookGuideDesc: '事件通知、回调配置',
  },

  // 弹窗
  modals: {
    // 编辑姓名
    editName: '编辑姓名',
    fullNameLabel: '姓名',
    fullNamePlaceholder: '输入您的姓名',

    // 更新邮箱
    updateEmail: '更新邮箱',
    emailLabel: '邮箱地址',
    emailPlaceholder: '输入您的邮箱',
    emailVerificationHint: '我们将向您的新邮箱发送验证链接。',

    // 订阅
    subscription: '订阅',
    free: '免费',
    forever: '永久',
    since: '开始时间',
    active: '活跃',
    noPlansAvailable: '暂无可用套餐',

    // 设置密码
    setPassword: '设置密码',
    changePassword: '修改密码',
    currentPassword: '当前密码',
    currentPasswordPlaceholder: '输入当前密码',
    newPassword: '新密码',
    newPasswordPlaceholder: '输入新密码',
    confirmPassword: '确认密码',
    confirmPasswordPlaceholder: '确认新密码',
    updatePassword: '更新密码',

    // 登出所有设备
    signOutAllTitle: '登出所有设备？',
    signOutAllDesc: '这将使您从所有设备登出（当前设备除外）。您需要在这些设备上重新登录。',
    signOutAll: '全部登出',

    // 禁用登录方式
    disableMethodTitle: '禁用 {method}？',
    disableMethodDesc: '在您重新启用之前，将无法使用此方式登录。',

    // 连接登录方式
    connectMethodTitle: '连接 {method}？',
    connectMethodDesc: '您将被重定向到 {method} 以授权连接。',

    // 用户详情
    username: '用户名',
    usernamePlaceholder: '输入用户名',
    password: '密码',
    passwordPlaceholder: '输入密码',

    // OAuth 设置
    editApplication: '编辑应用',
    optionalDescription: '可选描述',
  },

  // 集成指南
  integrationGuide: {
    // 页面标题
    pageTitle: 'OAuth 2.0 集成指南',
    pageSubtitle: '完整的 OAuth 2.0 和 OpenID Connect 认证服务集成文档。',
    back: '返回',

    // 导航
    sections: {
      quickStart: '快速开始',
      architecture: '架构',
      oidcDiscovery: 'OIDC 发现',
      pkceFlow: 'PKCE 流程',
      apiEndpoints: 'API 端点',
      tokens: 'Token 详情',
    },

    // 快速开始
    quickStart: {
      title: '快速开始',
      subtitle: '30 分钟内获取您的第一个 Access Token。',
      step1Title: '1. 注册您的应用',
      step1Desc: '在 {link} 中注册您的应用以开始使用。',
      step1Link: 'OAuth 应用',
      step1Items: [
        '应用名称 - 用户在授权时看到的名称',
        '重定向 URI - 用户授权后重定向的地址（需要 HTTPS）',
      ],
      securityTip: '安全提示：',
      securityTipContent: '切勿在前端代码中暴露 Client Secret。对于 SPA 和移动应用，请使用 PKCE 流程。',
      step2Title: '2. 发起授权',
      step2Desc: '将用户重定向到我们的授权端点：',
      step3Title: '3. 交换 Token',
      step3Desc: '用户授权后，用授权码交换 Token：',
    },

    // 架构
    architecture: {
      title: '架构',
      subtitle: '我们的认证系统基于模块化、分层架构构建。',
      components: [
        { title: '授权服务器', desc: '处理用户认证、授权请求和 Token 发放' },
        { title: 'Token 服务', desc: '管理 Access Token 和 Refresh Token 生命周期' },
        { title: '用户服务', desc: '管理用户身份和第三方账户绑定' },
        { title: '安全服务', desc: '提供双因素认证、设备指纹和会话监控' },
      ],
    },

    // OIDC 发现
    oidcDiscovery: {
      title: 'OIDC 发现',
      subtitle: '我们支持 OIDC 发现规范以简化客户端配置。',
      returns: '返回配置包括：',
      fields: {
        issuer: '发行者 URL',
        authorization_endpoint: '授权端点',
        token_endpoint: 'Token 端点',
        userinfo_endpoint: '用户信息端点',
        jwks_uri: 'JSON Web Key Set URL',
      },
    },

    // PKCE 流程
    pkceFlow: {
      title: 'PKCE 流程',
      subtitle: '为了最大安全性，我们建议所有应用类型都使用 PKCE。',
      steps: [
        { title: '生成 code_verifier', desc: '高熵随机字符串' },
        { title: '创建 code_challenge', desc: 'SHA-256 哈希，然后 Base64Url 编码' },
        { title: '包含在授权请求中', desc: '发送 code_challenge 和方法 S256' },
        { title: '用 code_verifier 交换', desc: '服务器通过哈希和比较进行验证' },
      ],
      jsImplementation: 'JavaScript 实现',
    },

    // API 端点
    apiEndpoints: {
      title: 'API 端点',
      authEndpoint: '授权端点',
      tokenEndpoint: 'Token 端点',
      userInfoEndpoint: '用户信息端点',
      successResponse: '成功响应',
      requiresBearer: '需要在 Authorization 头中携带 Bearer token。',
    },

    // 参数表格
    params: {
      parameter: '参数',
      type: '类型',
      description: '描述',
      // 授权端点参数
      response_type: '必须为 "code"',
      client_id: '您的应用 Client ID',
      redirect_uri: '授权后的回调 URL',
      scope: '空格分隔的权限范围（如 openid profile email）',
      state: '用于 CSRF 防护的随机字符串',
      code_challenge: 'PKCE 挑战码',
      code_challenge_method: '必须为 "S256"',
      // Token 端点参数
      grant_type: '"authorization_code" 或 "refresh_token"',
      code: '回调中的授权码',
      redirect_uri_token: '必须与授权请求一致',
      client_id_token: '您的 Client ID',
      client_secret: '您的 Client Secret',
      code_verifier: '原始 PKCE verifier',
    },

    // Token 详情
    tokens: {
      title: 'Token 详情',
      format: '格式',
      purpose: '用途',
      lifecycle: '生命周期',
      storage: '存储',
      accessToken: {
        title: 'Access Token',
        format: 'JWT (RS256)',
        purpose: '访问受保护资源的凭证',
        lifecycle: '短期有效（建议 1 小时）',
        storage: '客户端内存，避免 Local Storage',
      },
      refreshToken: {
        title: 'Refresh Token',
        format: '不透明加密字符串',
        purpose: '无需重新认证即可获取新的 Access Token',
        lifecycle: '长期有效（15 天），每次使用后轮换',
        storage: '服务端 httpOnly、secure、sameSite=strict Cookie',
      },
      idToken: {
        title: 'ID Token',
        format: 'JWT（OIDC 规范）',
        purpose: '在客户端验证用户身份',
        lifecycle: '与 Access Token 相同',
        storage: '客户端内存',
      },
    },

    // 页脚
    footer: {
      needHelp: '需要帮助？联系我们：',
    },
  },

  // Toast 消息
  toast: {
    disabled: '{method} 已禁用',
    disabling: '禁用中...',
    connected: '{method} 已连接',
    connecting: '连接中...',
    passwordUpdated: '密码已更新',
    updatingPassword: '更新密码中...',
    signedOutAll: '已登出所有设备',
    signingOut: '登出中...',
    userUpdated: '用户已更新',
    userAdded: '用户已添加',
    addingUser: '添加用户中...',
    appUpdated: '应用已更新',
    nameUpdated: '用户名已更新',
    emailUpdated: '验证邮件已发送',
  },
};

export type Locale = {
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    close: string;
    confirm: string;
    back: string;
    next: string;
    create: string;
    add: string;
    enable: string;
    disable: string;
    connect: string;
    upgrade: string;
    processing: string;
    saving: string;
    loading: string;
    copy: string;
    copied: string;
    setup: string;
    manage: string;
    remove: string;
    set: string;
    change: string;
    linked: string;
  };
  nav: {
    account: string;
    security: string;
    sessions: string;
    user: string;
    oauth: string;
    returnHome: string;
  };
  welcome: {
    greeting: string;
    subtitle: string;
  };
  account: {
    title: string;
    description: string;
    fullName: string;
    email: string;
    subscription: string;
    manageSubscription: string;
    accountCreated: string;
    editName: string;
    updateEmail: string;
    manage: string;
    language: string;
    languageDescription: string;
    notSet: string;
    verified: string;
    unverified: string;
    password: string;
    passwordSet: string;
    passwordNotSet: string;
    freePlan: string;
    linkedAccount: string;
    setPasswordHint: string;
    signInMethods: string;
    signInMethodsDesc: string;
    emailPassword: string;
    emailPasswordDesc: string;
    connectAccount: string;
  };
  security: {
    title: string;
    description: string;
    addMfaDevice: string;
    addMfaDesc: string;
    authenticatorApp: string;
    biometricAuth: string;
    loginWithPassword: string;
    loginWithPasswordDesc: string;
    setPassword: string;
    mfa: string;
    mfaDesc: string;
    setupMfa: string;
    deviceTypeApp: string;
    deviceTypeBiometric: string;
    deviceType: string;
    addedOn: string;
    recoveryCodes: string;
    recoveryCodesDesc: string;
    recoveryCodesExist: string;
    recoveryCodesGenerate: string;
    recoveryCodesHint: string;
    generateCodes: string;
    regenerateCodes: string;
    regenerateWarning: string;
    mfaSetupComplete: string;
    authenticatorEnabled: string;
    biometricEnabled: string;
    scanQrCode: string;
    qrCodeHint: string;
    enterCode: string;
    verifyAndEnable: string;
    addBiometric: string;
    setupBiometric: string;
    biometricDesc: string;
    deviceName: string;
    deviceNamePlaceholder: string;
    deviceNameHint: string;
    startBiometricSetup: string;
  };
  sessions: {
    title: string;
    description: string;
    currentSession: string;
    activeSessions: string;
    location: string;
    createdOn: string;
    expiresOn: string;
    ipAddress: string;
    timezone: string;
    signOutAll: string;
  };
  users: {
    title: string;
    description: string;
    systemUsers: string;
    systemUsersDesc: string;
    addUser: string;
    searchUsers: string;
    email: string;
    name: string;
    role: string;
    status: string;
    created: string;
    emailVerified: string;
    twoFactorEnabled: string;
    biometricEnabled: string;
    providers: string;
    roles: {
      user: string;
      admin: string;
      super_admin: string;
    };
  };
  oauth: {
    title: string;
    description: string;
    applications: string;
    applicationsDesc: string;
    searchApps: string;
    application: string;
    clientId: string;
    clientSecret: string;
    usage: string;
    authorizations: string;
    viewGuide: string;
    createApp: string;
    createAppDesc: string;
    appName: string;
    appNamePlaceholder: string;
    appNameHint: string;
    descriptionOptional: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    redirectUris: string;
    redirectUrisPlaceholder: string;
    redirectUrisHint: string;
    permissions: string;
    permissionsDesc: string;
    requiredScope: string;
    scopes: {
      openid: string;
      openidDesc: string;
      profile: string;
      profileDesc: string;
      email: string;
      emailDesc: string;
      phone: string;
      phoneDesc: string;
      address: string;
      addressDesc: string;
      offline_access: string;
      offline_accessDesc: string;
    };
    appCreated: string;
    saveCredentials: string;
    documentation: string;
    integrationGuide: string;
    apiReference: string;
    codeExamples: string;
    backToApps: string;
    createApplication: string;
  };
  docs: {
    title: string;
    description: string;
    comingSoon: string;
    needHelp: string;
    oauthGuide: string;
    oauthGuideDesc: string;
    securityGuide: string;
    securityGuideDesc: string;
    userApiGuide: string;
    userApiGuideDesc: string;
    webhookGuide: string;
    webhookGuideDesc: string;
  };
  modals: {
    editName: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    updateEmail: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailVerificationHint: string;
    subscription: string;
    free: string;
    forever: string;
    since: string;
    active: string;
    noPlansAvailable: string;
    setPassword: string;
    changePassword: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    updatePassword: string;
    signOutAllTitle: string;
    signOutAllDesc: string;
    signOutAll: string;
    disableMethodTitle: string;
    disableMethodDesc: string;
    connectMethodTitle: string;
    connectMethodDesc: string;
    username: string;
    usernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    editApplication: string;
    optionalDescription: string;
  };
  toast: {
    disabled: string;
    disabling: string;
    connected: string;
    connecting: string;
    passwordUpdated: string;
    updatingPassword: string;
    signedOutAll: string;
    signingOut: string;
    userUpdated: string;
    userAdded: string;
    addingUser: string;
    appUpdated: string;
    nameUpdated: string;
    emailUpdated: string;
  };
  integrationGuide: {
    pageTitle: string;
    pageSubtitle: string;
    back: string;
    sections: {
      quickStart: string;
      architecture: string;
      oidcDiscovery: string;
      pkceFlow: string;
      apiEndpoints: string;
      tokens: string;
    };
    quickStart: {
      title: string;
      subtitle: string;
      step1Title: string;
      step1Desc: string;
      step1Link: string;
      step1Items: string[];
      securityTip: string;
      securityTipContent: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
    };
    architecture: {
      title: string;
      subtitle: string;
      components: { title: string; desc: string }[];
    };
    oidcDiscovery: {
      title: string;
      subtitle: string;
      returns: string;
      fields: {
        issuer: string;
        authorization_endpoint: string;
        token_endpoint: string;
        userinfo_endpoint: string;
        jwks_uri: string;
      };
    };
    pkceFlow: {
      title: string;
      subtitle: string;
      steps: { title: string; desc: string }[];
      jsImplementation: string;
    };
    apiEndpoints: {
      title: string;
      authEndpoint: string;
      tokenEndpoint: string;
      userInfoEndpoint: string;
      successResponse: string;
      requiresBearer: string;
    };
    params: {
      parameter: string;
      type: string;
      description: string;
      response_type: string;
      client_id: string;
      redirect_uri: string;
      scope: string;
      state: string;
      code_challenge: string;
      code_challenge_method: string;
      grant_type: string;
      code: string;
      redirect_uri_token: string;
      client_id_token: string;
      client_secret: string;
      code_verifier: string;
    };
    tokens: {
      title: string;
      format: string;
      purpose: string;
      lifecycle: string;
      storage: string;
      accessToken: {
        title: string;
        format: string;
        purpose: string;
        lifecycle: string;
        storage: string;
      };
      refreshToken: {
        title: string;
        format: string;
        purpose: string;
        lifecycle: string;
        storage: string;
      };
      idToken: {
        title: string;
        format: string;
        purpose: string;
        lifecycle: string;
        storage: string;
      };
    };
    footer: {
      needHelp: string;
    };
  };
};
