// ─────────────────────────────────────────────────────────────
// LC Novel Studio — Translation Dictionary
// ─────────────────────────────────────────────────────────────
// Add a new language by adding a new key to `translations` and
// providing values for every TranslationKey. TypeScript will
// enforce completeness — if a key is missing, the build fails.

export type LanguageCode = 'en' | 'es' | 'zh'

export type TranslationKey =
  // Login screen
  | 'appName'
  | 'appTagline'
  | 'usernameOrEmail'
  | 'username'
  | 'email'
  | 'passphrase'
  | 'securePassphrase'
  | 'enter'
  | 'initiateCreation'
  | 'noAccount'
  | 'createOne'
  | 'alreadyRegistered'
  | 'logIn'
  | 'forgotPassphrase'
  | 'orConnectWith'
  | 'google'
  | 'discord'
  | 'systemOnline'
  | 'footerCredit'
  | 'chooseUsername'
  | 'emailAddress'
  | 'authenticating'
  | 'creatingAccount'
  | 'writersWorkspace'
  | 'aiPoweredPlatform'

  // Sidebar / Dashboard nav
  | 'newChat'
  | 'searchChat'
  | 'library'
  | 'projects'
  | 'drawingStudio'
  | 'guild'
  | 'circle'
  | 'overseerPanel'
  | 'recentChats'
  | 'activeProject'
  | 'openMenu'
  | 'closeMenu'

  // Settings — tabs
  | 'settings'
  | 'general'
  | 'notifications'
  | 'profileAccount'
  | 'personalization'
  | 'keyboardShortcuts'
  | 'logOut'

  // Settings — general
  | 'appearance'
  | 'appearanceDefault'
  | 'appearanceDark'
  | 'appearanceLight'
  | 'accentColor'
  | 'appLanguage'
  | 'startupBehavior'
  | 'sendWithEnter'
  | 'autoSaveDocuments'
  | 'smartReadingCompanion'
  | 'aiChatMemoryAutoload'
  | 'voiceAndCommunication'
  | 'allowIncomingCalls'
  | 'showCallAlerts'
  | 'notificationDelivery'
  | 'showMessagePreviews'
  | 'reactionNotifications'
  | 'deliveryMethod'

  // Settings — notifications
  | 'hubs'
  | 'sharedProjects'
  | 'projectAnalysis'
  | 'aiArt'
  | 'loreGaps'
  | 'productUpdates'
  | 'feedbackEmails'

  // Settings — profile
  | 'profilePicture'
  | 'profilePictureHint'
  | 'uploadNew'
  | 'displayName'
  | 'emailLabel'
  | 'presencePrivacy'
  | 'saveChanges'
  | 'ascensionStatus'
  | 'attunementProgress'
  | 'linkedAccounts'
  | 'link'
  | 'disconnect'
  | 'linked'
  | 'notLinked'
  | 'changePassword'
  | 'currentPassword'
  | 'newPassword'
  | 'confirmNewPassword'
  | 'updatePassword'
  | 'deleteAccount'
  | 'deleteAccountHint'
  | 'delete'

  // Settings — personalization
  | 'accentTheme'
  | 'typography'
  | 'fontFamily'
  | 'fontSize'
  | 'lineSpacing'
  | 'compactMode'
  | 'reduceMotion'
  | 'aiAlignment'
  | 'creativityVsDiscipline'
  | 'verbosity'
  | 'globalWorkspaceDirectives'
  | 'globalDirectivesHint'

  // Settings — keyboard
  | 'keyboardShortcutsHint'
  | 'sendMessage'
  | 'newLineInMessage'
  | 'searchChats'
  | 'toggleSidebar'
  | 'openStoryBible'
  | 'toggleWordCountViewer'
  | 'expandInput'
  | 'boldInEditor'
  | 'italicInEditor'
  | 'underlineInEditor'
  | 'saveDocument'
  | 'acceptGhostText'
  | 'openSettings'
  | 'switchAccount'

  // Logout overlay
  | 'logoutConfirmTitle'
  | 'logoutConfirmBody'
  | 'logoutButton'
  | 'cancel'

  // Common
  | 'loading'

export type TranslationDict = Record<TranslationKey, string>

// ─── English (US) ────────────────────────────────────────────
const en: TranslationDict = {
  appName: 'L-C',
  appTagline: 'Lucian Creation',
  usernameOrEmail: 'Username or Email',
  username: 'Username',
  email: 'Email',
  passphrase: 'Passphrase',
  securePassphrase: 'Secure Passphrase',
  enter: 'E N T E R',
  initiateCreation: 'I N I T I A T E   C R E A T I O N',
  noAccount: 'No account?',
  createOne: 'Create one',
  alreadyRegistered: 'Already registered?',
  logIn: 'Log in',
  forgotPassphrase: 'Forgot Passphrase?',
  orConnectWith: 'Or connect with auth key',
  google: 'Google',
  discord: 'Discord',
  systemOnline: 'System Online',
  footerCredit: 'Created by L to help writers bring their stories to life.',
  chooseUsername: 'Choose Username',
  emailAddress: 'Email Address',
  authenticating: 'Authenticating...',
  creatingAccount: 'Creating account...',
  writersWorkspace: 'Lucian Creation / Writers Workspace',
  aiPoweredPlatform: 'AI-Powered Novel Writing Platform',

  newChat: 'New Chat',
  searchChat: 'Search Chat',
  library: 'Library',
  projects: 'Projects',
  drawingStudio: 'Drawing Studio',
  guild: 'Guild',
  circle: 'Circle',
  overseerPanel: 'Overseer Panel',
  recentChats: 'Recent Chats',
  activeProject: 'Active Project',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',

  settings: 'Settings',
  general: 'General',
  notifications: 'Notifications',
  profileAccount: 'Profile & Account',
  personalization: 'Personalization',
  keyboardShortcuts: 'Keyboard Shortcuts',
  logOut: 'Log Out',

  appearance: 'Appearance',
  appearanceDefault: 'Default',
  appearanceDark: 'Dark',
  appearanceLight: 'Light',
  accentColor: 'Accent Color',
  appLanguage: 'App Language',
  startupBehavior: 'Startup Behavior',
  sendWithEnter: 'Send messages with Enter',
  autoSaveDocuments: 'Auto-save documents',
  smartReadingCompanion: 'Enable Smart Reading Companion',
  aiChatMemoryAutoload: 'AI Chat Memory Autoload',
  voiceAndCommunication: 'Voice & Communication',
  allowIncomingCalls: 'Allow incoming calls',
  showCallAlerts: 'Show call alerts',
  notificationDelivery: 'Notification Delivery',
  showMessagePreviews: 'Show message previews',
  reactionNotifications: 'Reaction notifications',
  deliveryMethod: 'Delivery method',

  hubs: 'Hubs',
  sharedProjects: 'Shared Projects',
  projectAnalysis: 'Project Analysis',
  aiArt: 'AI Art',
  loreGaps: 'Lore Gaps',
  productUpdates: 'Product Updates',
  feedbackEmails: 'Feedback Emails',

  profilePicture: 'Profile Picture',
  profilePictureHint: 'Click the avatar to upload a new image. PNG or JPG, max 2MB.',
  uploadNew: 'Upload new',
  displayName: 'Display Name',
  emailLabel: 'Email',
  presencePrivacy: 'Presence Privacy',
  saveChanges: 'Save Changes',
  ascensionStatus: 'Ascension Status',
  attunementProgress: 'Attunement Progress',
  linkedAccounts: 'Linked Accounts',
  link: 'Link',
  disconnect: 'Disconnect',
  linked: 'Linked',
  notLinked: 'Not Linked',
  changePassword: 'Change Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  updatePassword: 'Update Password',
  deleteAccount: 'Delete account',
  deleteAccountHint: 'Permanently remove your account and all data.',
  delete: 'Delete',

  accentTheme: 'Accent Theme',
  typography: 'Typography',
  fontFamily: 'Font Family',
  fontSize: 'Font Size',
  lineSpacing: 'Line Spacing',
  compactMode: 'Compact mode',
  reduceMotion: 'Reduce motion',
  aiAlignment: 'AI Alignment',
  creativityVsDiscipline: 'Creativity vs. Discipline',
  verbosity: 'Verbosity',
  globalWorkspaceDirectives: 'Global Workspace Directives',
  globalDirectivesHint: 'These directives are appended to every AI prompt in this workspace.',

  keyboardShortcutsHint: 'Keyboard shortcuts available across L-C. These reflect the current keymap.',
  sendMessage: 'Send message',
  newLineInMessage: 'New line in message',
  searchChats: 'Search chats',
  toggleSidebar: 'Toggle sidebar',
  openStoryBible: 'Open Story Bible',
  toggleWordCountViewer: 'Toggle Word Count Viewer',
  expandInput: 'Expand input',
  boldInEditor: 'Bold (in editor)',
  italicInEditor: 'Italic (in editor)',
  underlineInEditor: 'Underline (in editor)',
  saveDocument: 'Save document',
  acceptGhostText: 'Accept ghost text',
  openSettings: 'Open Settings',
  switchAccount: 'Switch account',

  logoutConfirmTitle: 'Are you sure you want to log out?',
  logoutConfirmBody: 'You will need to sign in again to continue writing.',
  logoutButton: 'Log out',
  cancel: 'Cancel',

  loading: 'Loading...',
}

// ─── Español ─────────────────────────────────────────────────
const es: TranslationDict = {
  appName: 'L-C',
  appTagline: 'Creación Lucian',
  usernameOrEmail: 'Usuario o Correo',
  username: 'Usuario',
  email: 'Correo',
  passphrase: 'Frase de acceso',
  securePassphrase: 'Frase de acceso segura',
  enter: 'E N T R A R',
  initiateCreation: 'I N I C I A R   C R E A C I Ó N',
  noAccount: '¿No tienes cuenta?',
  createOne: 'Crear una',
  alreadyRegistered: '¿Ya registrado?',
  logIn: 'Iniciar sesión',
  forgotPassphrase: '¿Olvidaste tu frase?',
  orConnectWith: 'O conéctate con clave de auth',
  google: 'Google',
  discord: 'Discord',
  systemOnline: 'Sistema en línea',
  footerCredit: 'Creado por L para ayudar a los escritores a dar vida a sus historias.',
  chooseUsername: 'Elige tu usuario',
  emailAddress: 'Correo electrónico',
  authenticating: 'Autenticando...',
  creatingAccount: 'Creando cuenta...',
  writersWorkspace: 'Creación Lucian / Espacio de Escritores',
  aiPoweredPlatform: 'Plataforma de Escritura de Novelas con IA',

  newChat: 'Nuevo Chat',
  searchChat: 'Buscar Chat',
  library: 'Biblioteca',
  projects: 'Proyectos',
  drawingStudio: 'Estudio de Dibujo',
  guild: 'Gremio',
  circle: 'Círculo',
  overseerPanel: 'Panel del Supervisor',
  recentChats: 'Chats recientes',
  activeProject: 'Proyecto activo',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',

  settings: 'Ajustes',
  general: 'General',
  notifications: 'Notificaciones',
  profileAccount: 'Perfil y Cuenta',
  personalization: 'Personalización',
  keyboardShortcuts: 'Atajos de teclado',
  logOut: 'Cerrar sesión',

  appearance: 'Apariencia',
  appearanceDefault: 'Predeterminado',
  appearanceDark: 'Oscuro',
  appearanceLight: 'Claro',
  accentColor: 'Color de acento',
  appLanguage: 'Idioma de la app',
  startupBehavior: 'Comportamiento de inicio',
  sendWithEnter: 'Enviar mensajes con Enter',
  autoSaveDocuments: 'Auto-guardar documentos',
  smartReadingCompanion: 'Activar Compañero de Lectura Inteligente',
  aiChatMemoryAutoload: 'Cargar memoria del chat IA automáticamente',
  voiceAndCommunication: 'Voz y Comunicación',
  allowIncomingCalls: 'Permitir llamadas entrantes',
  showCallAlerts: 'Mostrar alertas de llamadas',
  notificationDelivery: 'Entrega de notificaciones',
  showMessagePreviews: 'Mostrar vista previa de mensajes',
  reactionNotifications: 'Notificaciones de reacciones',
  deliveryMethod: 'Método de entrega',

  hubs: 'Comunidades',
  sharedProjects: 'Proyectos compartidos',
  projectAnalysis: 'Análisis de proyecto',
  aiArt: 'Arte IA',
  loreGaps: 'Vacíos de lore',
  productUpdates: 'Actualizaciones del producto',
  feedbackEmails: 'Correos de feedback',

  profilePicture: 'Foto de perfil',
  profilePictureHint: 'Haz clic en el avatar para subir una nueva imagen. PNG o JPG, máximo 2MB.',
  uploadNew: 'Subir nueva',
  displayName: 'Nombre para mostrar',
  emailLabel: 'Correo',
  presencePrivacy: 'Privacidad de presencia',
  saveChanges: 'Guardar cambios',
  ascensionStatus: 'Estado de Ascensión',
  attunementProgress: 'Progreso de Sintonía',
  linkedAccounts: 'Cuentas vinculadas',
  link: 'Vincular',
  disconnect: 'Desconectar',
  linked: 'Vinculada',
  notLinked: 'No vinculada',
  changePassword: 'Cambiar contraseña',
  currentPassword: 'Contraseña actual',
  newPassword: 'Nueva contraseña',
  confirmNewPassword: 'Confirmar nueva contraseña',
  updatePassword: 'Actualizar contraseña',
  deleteAccount: 'Eliminar cuenta',
  deleteAccountHint: 'Elimina permanentemente tu cuenta y todos tus datos.',
  delete: 'Eliminar',

  accentTheme: 'Tema de acento',
  typography: 'Tipografía',
  fontFamily: 'Familia de fuente',
  fontSize: 'Tamaño de fuente',
  lineSpacing: 'Interlineado',
  compactMode: 'Modo compacto',
  reduceMotion: 'Reducir movimiento',
  aiAlignment: 'Alineación de IA',
  creativityVsDiscipline: 'Creatividad vs. Disciplina',
  verbosity: 'Verbosidad',
  globalWorkspaceDirectives: 'Directivas globales del espacio',
  globalDirectivesHint: 'Estas directivas se añaden a cada prompt de IA en este espacio.',

  keyboardShortcutsHint: 'Atajos de teclado disponibles en L-C. Reflejan el mapa actual.',
  sendMessage: 'Enviar mensaje',
  newLineInMessage: 'Nueva línea en mensaje',
  searchChats: 'Buscar chats',
  toggleSidebar: 'Alternar barra lateral',
  openStoryBible: 'Abrir Biblia de la Historia',
  toggleWordCountViewer: 'Alternar Visor de Conteo de Palabras',
  expandInput: 'Expandir entrada',
  boldInEditor: 'Negrita (en editor)',
  italicInEditor: 'Cursiva (en editor)',
  underlineInEditor: 'Subrayado (en editor)',
  saveDocument: 'Guardar documento',
  acceptGhostText: 'Aceptar texto fantasma',
  openSettings: 'Abrir Ajustes',
  switchAccount: 'Cambiar cuenta',

  logoutConfirmTitle: '¿Seguro que quieres cerrar sesión?',
  logoutConfirmBody: 'Tendrás que iniciar sesión de nuevo para seguir escribiendo.',
  logoutButton: 'Cerrar sesión',
  cancel: 'Cancelar',

  loading: 'Cargando...',
}

// ─── 简体中文 (Simplified Chinese) ───────────────────────────
const zh: TranslationDict = {
  appName: 'L-C',
  appTagline: '卢西安创作',
  usernameOrEmail: '用户名或邮箱',
  username: '用户名',
  email: '邮箱',
  passphrase: '访问口令',
  securePassphrase: '安全访问口令',
  enter: '进   入',
  initiateCreation: '启   动   创   作',
  noAccount: '没有账号？',
  createOne: '创建一个',
  alreadyRegistered: '已注册？',
  logIn: '登录',
  forgotPassphrase: '忘记口令？',
  orConnectWith: '或使用授权密钥连接',
  google: 'Google',
  discord: 'Discord',
  systemOnline: '系统在线',
  footerCredit: '由 L 创建，帮助作家将故事赋予生命。',
  chooseUsername: '选择用户名',
  emailAddress: '邮箱地址',
  authenticating: '正在验证...',
  creatingAccount: '正在创建账户...',
  writersWorkspace: '卢西安创作 / 作家工作区',
  aiPoweredPlatform: 'AI 驱动的小说写作平台',

  newChat: '新对话',
  searchChat: '搜索对话',
  library: '资料库',
  projects: '项目',
  drawingStudio: '绘画工作室',
  guild: '公会',
  circle: '私聊',
  overseerPanel: '监管者面板',
  recentChats: '最近对话',
  activeProject: '当前项目',
  openMenu: '打开菜单',
  closeMenu: '关闭菜单',

  settings: '设置',
  general: '常规',
  notifications: '通知',
  profileAccount: '个人资料与账户',
  personalization: '个性化',
  keyboardShortcuts: '键盘快捷键',
  logOut: '退出登录',

  appearance: '外观',
  appearanceDefault: '默认',
  appearanceDark: '深色',
  appearanceLight: '浅色',
  accentColor: '强调色',
  appLanguage: '应用语言',
  startupBehavior: '启动行为',
  sendWithEnter: '按 Enter 键发送消息',
  autoSaveDocuments: '自动保存文档',
  smartReadingCompanion: '启用智能阅读助手',
  aiChatMemoryAutoload: 'AI 对话记忆自动加载',
  voiceAndCommunication: '语音与通信',
  allowIncomingCalls: '允许来电',
  showCallAlerts: '显示通话提醒',
  notificationDelivery: '通知投递',
  showMessagePreviews: '显示消息预览',
  reactionNotifications: '表情回应通知',
  deliveryMethod: '投递方式',

  hubs: '社区',
  sharedProjects: '共享项目',
  projectAnalysis: '项目分析',
  aiArt: 'AI 艺术',
  loreGaps: '设定缺口',
  productUpdates: '产品更新',
  feedbackEmails: '反馈邮件',

  profilePicture: '头像',
  profilePictureHint: '点击头像上传新图像。支持 PNG 或 JPG，最大 2MB。',
  uploadNew: '上传新图',
  displayName: '显示名称',
  emailLabel: '邮箱',
  presencePrivacy: '在线状态隐私',
  saveChanges: '保存更改',
  ascensionStatus: '飞升状态',
  attunementProgress: '调谐进度',
  linkedAccounts: '已绑定账户',
  link: '绑定',
  disconnect: '解除绑定',
  linked: '已绑定',
  notLinked: '未绑定',
  changePassword: '修改密码',
  currentPassword: '当前密码',
  newPassword: '新密码',
  confirmNewPassword: '确认新密码',
  updatePassword: '更新密码',
  deleteAccount: '删除账户',
  deleteAccountHint: '永久删除你的账户及所有数据。',
  delete: '删除',

  accentTheme: '强调主题',
  typography: '排版',
  fontFamily: '字体族',
  fontSize: '字号',
  lineSpacing: '行距',
  compactMode: '紧凑模式',
  reduceMotion: '减少动画',
  aiAlignment: 'AI 对齐',
  creativityVsDiscipline: '创造力 vs 纪律',
  verbosity: '详细程度',
  globalWorkspaceDirectives: '全局工作区指令',
  globalDirectivesHint: '这些指令会附加到此工作区的每个 AI 提示词后。',

  keyboardShortcutsHint: 'L-C 中可用的键盘快捷键。反映当前键位映射。',
  sendMessage: '发送消息',
  newLineInMessage: '消息中换行',
  searchChats: '搜索对话',
  toggleSidebar: '切换侧边栏',
  openStoryBible: '打开故事圣经',
  toggleWordCountViewer: '切换字数统计查看器',
  expandInput: '展开输入框',
  boldInEditor: '加粗（编辑器内）',
  italicInEditor: '斜体（编辑器内）',
  underlineInEditor: '下划线（编辑器内）',
  saveDocument: '保存文档',
  acceptGhostText: '接受幽灵文本',
  openSettings: '打开设置',
  switchAccount: '切换账户',

  logoutConfirmTitle: '确定要退出登录吗？',
  logoutConfirmBody: '你需要重新登录才能继续写作。',
  logoutButton: '退出登录',
  cancel: '取消',

  loading: '加载中...',
}

// ─── Master dictionary ──────────────────────────────────────
export const translations: Record<LanguageCode, TranslationDict> = { en, es, zh }

// ─── Language picker options ────────────────────────────────
export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English (US)' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '简体中文' },
]

// ─── Map UI label strings (from the settings dropdown) → LanguageCode ───
// The settings dropdown emits string labels; we need to convert them back
// to a LanguageCode for the LanguageContext.
export const LANGUAGE_LABEL_TO_CODE: Record<string, LanguageCode> = {
  'English (US)': 'en',
  'English (UK)': 'en',
  'Français': 'en', // fallback (no FR translation yet)
  'Español': 'es',
  '日本語': 'en', // fallback (no JA translation yet)
  '简体中文': 'zh',
}

// ─── Translate function ────────────────────────────────────
// Falls back to the key itself if missing, then to English, then to the key.
export function translate(lang: LanguageCode, key: TranslationKey): string {
  const dict = translations[lang] || translations.en
  return dict[key] || translations.en[key] || String(key)
}
