-- ============================================================
--  lcit-middle-boot 系统管理模块  MySQL 8.0+ 建表脚本
--  来源 entity: com.linkcloud.system.model.entity (13 个)
--  引擎:      InnoDB
--  字符集:    utf8mb4 / utf8mb4_unicode_ci
--  说明:      字段顺序与 Java 实体一一对应
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
--  清理顺序(从子表到主表)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user_notice`;
DROP TABLE IF EXISTS `sys_user_role`;
DROP TABLE IF EXISTS `sys_role_menu`;
DROP TABLE IF EXISTS `sys_dict_item`;
DROP TABLE IF EXISTS `sys_dict`;
DROP TABLE IF EXISTS `sys_file`;
DROP TABLE IF EXISTS `sys_log`;
DROP TABLE IF EXISTS `sys_notice`;
DROP TABLE IF EXISTS `sys_user`;
DROP TABLE IF EXISTS `sys_role`;
DROP TABLE IF EXISTS `sys_menu`;
DROP TABLE IF EXISTS `sys_dept`;
DROP TABLE IF EXISTS `sys_config`;

-- ============================================================
--  1. sys_user  用户表
--      继承 BaseEntity(id/createTime/updateTime/isDeleted)
-- ============================================================
CREATE TABLE `sys_user` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `username`    VARCHAR(64)     NOT NULL                               COMMENT '用户名',
  `nickname`    VARCHAR(64)     DEFAULT NULL                           COMMENT '昵称',
  `gender`      TINYINT         DEFAULT 0                              COMMENT '性别(1-男 2-女 0-保密)',
  `password`    VARCHAR(128)    NOT NULL                               COMMENT '密码(BCrypt)',
  `salt`        VARCHAR(32)     DEFAULT NULL                           COMMENT '加密盐',
  `dept_id`     BIGINT UNSIGNED DEFAULT NULL                           COMMENT '部门ID',
  `avatar`      VARCHAR(255)    DEFAULT NULL                           COMMENT '用户头像',
  `mobile`      VARCHAR(20)     DEFAULT NULL                           COMMENT '联系方式',
  `status`      TINYINT         DEFAULT 1                              COMMENT '状态(1-正常 0-禁用)',
  `email`       VARCHAR(128)    DEFAULT NULL                           COMMENT '用户邮箱',
  `openid`      VARCHAR(64)     DEFAULT NULL                           COMMENT '微信 openid',
  `is_deleted`  TINYINT         DEFAULT 0                              COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `remark`      VARCHAR(500)    DEFAULT NULL                           COMMENT '备注',
  `create_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '创建人ID',
  `update_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '修改人ID',
  `create_time` DATETIME        DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME        DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_dept_id`  (`dept_id`),
  KEY `idx_mobile`   (`mobile`),
  KEY `idx_email`    (`email`),
  KEY `idx_status`   (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================
--  2. sys_role  角色表
--      继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_role` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `name`        VARCHAR(64)     NOT NULL                               COMMENT '角色名称',
  `code`        VARCHAR(64)     NOT NULL                               COMMENT '角色编码',
  `sort`        INT             DEFAULT 0                              COMMENT '显示顺序',
  `status`      TINYINT         DEFAULT 1                              COMMENT '角色状态(1-正常 0-停用)',
  `data_scope`  TINYINT         DEFAULT NULL                           COMMENT '数据权限(1-ALL 2-DEPT 3-DEPT_AND_CHILD 4-DEPT_AND_PARENT 5-SELF 6-CUSTOM)',
  `is_deleted`  TINYINT         DEFAULT 0                              COMMENT '是否删除(0-否 1-是)',
  `create_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '创建人ID',
  `update_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '更新人ID',
  `create_time` DATETIME        DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME        DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code`   (`code`),
  KEY        `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ============================================================
--  3. sys_menu  菜单管理表  (不继承 BaseEntity,自带 create/updateTime,无 isDeleted)
-- ============================================================
CREATE TABLE `sys_menu` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT              COMMENT '菜单ID',
  `parent_id`     BIGINT UNSIGNED DEFAULT 0                            COMMENT '父菜单ID',
  `name`          VARCHAR(64)    NOT NULL                              COMMENT '菜单名称',
  `type`          TINYINT        NOT NULL                              COMMENT '菜单类型(1-菜单;2-目录;3-外链;4-按钮权限)',
  `route_name`    VARCHAR(64)    DEFAULT NULL                          COMMENT '路由名称(Vue Router name)',
  `route_path`    VARCHAR(255)   DEFAULT NULL                          COMMENT '路由路径',
  `component`     VARCHAR(255)   DEFAULT NULL                          COMMENT '组件路径(省略 .vue 后缀)',
  `perm`          VARCHAR(128)   DEFAULT NULL                          COMMENT '权限标识',
  `visible`       TINYINT        DEFAULT 1                             COMMENT '显示状态(1:显示;0:隐藏)',
  `sort`          INT            DEFAULT 0                             COMMENT '排序',
  `icon`          VARCHAR(64)    DEFAULT NULL                          COMMENT '菜单图标',
  `redirect`      VARCHAR(255)   DEFAULT NULL                          COMMENT '跳转路径',
  `tree_path`     VARCHAR(500)   DEFAULT NULL                          COMMENT '父节点路径,以英文逗号(,)分割',
  `keep_alive`    TINYINT        DEFAULT 0                             COMMENT '【菜单】是否开启页面缓存(1:开启;0:关闭)',
  `always_show`   TINYINT        DEFAULT 0                             COMMENT '【目录】只有一个子路由是否始终显示(1:是 0:否)',
  `requires_auth` TINYINT        DEFAULT 1                             COMMENT '是否需要登录权限(1:是 0:否)',
  `params`        VARCHAR(500)   DEFAULT NULL                          COMMENT '路由参数',
  `create_time`   DATETIME       DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `update_time`   DATETIME       DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_type`      (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表';

-- ============================================================
--  4. sys_dept  部门表
--      继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_dept` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `name`        VARCHAR(64)     NOT NULL                               COMMENT '部门名称',
  `code`        VARCHAR(64)     DEFAULT NULL                           COMMENT '部门编码',
  `parent_id`   BIGINT UNSIGNED DEFAULT 0                              COMMENT '父节点id',
  `tree_path`   VARCHAR(500)    DEFAULT NULL                           COMMENT '父节点id路径',
  `sort`        INT             DEFAULT 0                              COMMENT '显示顺序',
  `status`      TINYINT         DEFAULT 1                              COMMENT '状态(1-正常 0-禁用)',
  `is_deleted`  TINYINT         DEFAULT 0                              COMMENT '是否删除(0-否 1-是)',
  `create_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '创建人ID',
  `update_by`   BIGINT UNSIGNED DEFAULT NULL                           COMMENT '更新人ID',
  `create_time` DATETIME        DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME        DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status`    (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- ============================================================
--  5. sys_user_role  用户-角色 关联表
--      关联表没有 @TableId,加自增 id + 唯一索引
-- ============================================================
CREATE TABLE `sys_user_role` (
  `id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` BIGINT UNSIGNED NOT NULL                COMMENT '用户ID',
  `role_id` BIGINT UNSIGNED NOT NULL                COMMENT '角色ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY        `idx_role_id`   (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户和角色关联表';

-- ============================================================
--  6. sys_role_menu  角色-菜单 关联表
-- ============================================================
CREATE TABLE `sys_role_menu` (
  `id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_id` BIGINT UNSIGNED NOT NULL                COMMENT '角色ID',
  `menu_id` BIGINT UNSIGNED NOT NULL                COMMENT '菜单ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`),
  KEY        `idx_menu_id`   (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色和菜单关联表';

-- ============================================================
--  7. sys_config  系统配置表
--      继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_config` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT               COMMENT '主键ID',
  `config_name`  VARCHAR(64)    NOT NULL                              COMMENT '配置名称',
  `config_key`   VARCHAR(128)   NOT NULL                              COMMENT '配置键',
  `config_value` TEXT           DEFAULT NULL                          COMMENT '配置值',
  `remark`       VARCHAR(500)   DEFAULT NULL                          COMMENT '描述、备注',
  `is_deleted`   TINYINT        DEFAULT 0                             COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `create_by`    BIGINT UNSIGNED DEFAULT NULL                         COMMENT '创建人ID',
  `update_by`    BIGINT UNSIGNED DEFAULT NULL                         COMMENT '更新人ID',
  `create_time`  DATETIME       DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `update_time`  DATETIME       DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================================
--  8. sys_dict  字典表
--      继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_dict` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `dict_code`   VARCHAR(64)    NOT NULL                               COMMENT '字典编码',
  `name`        VARCHAR(64)    NOT NULL                               COMMENT '字典名称',
  `status`      TINYINT        DEFAULT 1                              COMMENT '状态(1:启用, 0:停用)',
  `remark`      VARCHAR(500)   DEFAULT NULL                           COMMENT '备注',
  `is_deleted`  TINYINT        DEFAULT 0                              COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `create_by`   BIGINT UNSIGNED DEFAULT NULL                          COMMENT '创建人ID',
  `update_by`   BIGINT UNSIGNED DEFAULT NULL                          COMMENT '更新人ID',
  `create_time` DATETIME       DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME       DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';

-- ============================================================
--  9. sys_dict_item  字典项表
--      继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_dict_item` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `dict_code`   VARCHAR(64)    NOT NULL                               COMMENT '字典编码(关联 sys_dict.dict_code)',
  `label`       VARCHAR(64)    NOT NULL                               COMMENT '字典项名称',
  `value`       VARCHAR(255)   NOT NULL                               COMMENT '字典项值',
  `sort`        INT            DEFAULT 0                              COMMENT '排序',
  `status`      TINYINT        DEFAULT 1                              COMMENT '状态(1-正常, 0-禁用)',
  `remark`      VARCHAR(500)   DEFAULT NULL                           COMMENT '备注',
  `tag_type`    VARCHAR(32)    DEFAULT NULL                           COMMENT '标签类型',
  `is_deleted`  TINYINT        DEFAULT 0                              COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `create_by`   BIGINT UNSIGNED DEFAULT NULL                          COMMENT '创建人ID',
  `update_by`   BIGINT UNSIGNED DEFAULT NULL                          COMMENT '更新人ID',
  `create_time` DATETIME       DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME       DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- ============================================================
--  10. sys_file  文件表
--       不继承 BaseEntity,自带 create/updateTime,无 isDeleted
-- ============================================================
CREATE TABLE `sys_file` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT              COMMENT '主键ID',
  `biz_id`        VARCHAR(64)   DEFAULT NULL                          COMMENT '业务Id',
  `file_name`     VARCHAR(255)  NOT NULL                              COMMENT '文件名',
  `original_name` VARCHAR(255)  DEFAULT NULL                          COMMENT '原始文件名',
  `file_type`     VARCHAR(32)   DEFAULT NULL                          COMMENT '文件类型/后缀名',
  `file_size`     BIGINT UNSIGNED DEFAULT 0                           COMMENT '文件大小(字节)',
  `size_display`  VARCHAR(32)   DEFAULT NULL                          COMMENT '显示文件大小(如 130KB)',
  `storage_path`  VARCHAR(500)  NOT NULL                              COMMENT '服务器存储路径',
  `file_url`      VARCHAR(500)  DEFAULT NULL                          COMMENT '文件访问URL',
  `source_type`   VARCHAR(32)   DEFAULT NULL                          COMMENT '文件来源:二维码生成/用户上传 等',
  `status`        TINYINT       DEFAULT 1                             COMMENT '文件状态(1=有效,0=删除)',
  `create_time`   DATETIME      DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `update_time`   DATETIME      DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_biz_id`      (`biz_id`),
  KEY `idx_source_type` (`source_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- ============================================================
--  11. sys_log  系统日志表
--       不继承 BaseEntity,implements Serializable
--       request_method / request_params / response_content 显式 @TableField 映射
-- ============================================================
CREATE TABLE `sys_log` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT           COMMENT '主键ID',
  `module`           VARCHAR(32)   DEFAULT NULL                        COMMENT '日志模块(LogModuleEnum:EXCEPTION/LOGIN/USER/DEPT/ROLE/MENU/DICT/SETTING/OTHER)',
  `request_method`   VARCHAR(16)   DEFAULT NULL                        COMMENT '请求方式(GET/POST/...)',
  `request_params`   TEXT          DEFAULT NULL                        COMMENT '请求参数',
  `response_content` TEXT          DEFAULT NULL                        COMMENT '响应参数',
  `content`          VARCHAR(500)  DEFAULT NULL                        COMMENT '日志内容',
  `request_uri`      VARCHAR(255)  DEFAULT NULL                        COMMENT '请求路径',
  `method`           VARCHAR(255)  DEFAULT NULL                        COMMENT '请求方法(Controller#Method)',
  `ip`               VARCHAR(64)   DEFAULT NULL                        COMMENT 'IP 地址',
  `province`         VARCHAR(64)   DEFAULT NULL                        COMMENT '省份',
  `city`             VARCHAR(64)   DEFAULT NULL                        COMMENT '城市',
  `browser`          VARCHAR(64)   DEFAULT NULL                        COMMENT '浏览器',
  `browser_version`  VARCHAR(64)   DEFAULT NULL                        COMMENT '浏览器版本',
  `os`               VARCHAR(64)   DEFAULT NULL                        COMMENT '终端系统',
  `execution_time`   BIGINT        DEFAULT 0                           COMMENT '执行时间(毫秒)',
  `create_by`        BIGINT UNSIGNED DEFAULT NULL                      COMMENT '创建人ID',
  `create_time`      DATETIME      DEFAULT CURRENT_TIMESTAMP            COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_module`     (`module`),
  KEY `idx_create_by`  (`create_by`),
  KEY `idx_create_time`(`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';

-- ============================================================
--  12. sys_notice  通知公告表
--       继承 BaseEntity
-- ============================================================
CREATE TABLE `sys_notice` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT             COMMENT '主键ID',
  `title`           VARCHAR(255)    NOT NULL                            COMMENT '通知标题',
  `content`         TEXT            DEFAULT NULL                        COMMENT '通知内容',
  `type`            TINYINT         DEFAULT 1                           COMMENT '通知类型',
  `publisher_id`    BIGINT UNSIGNED DEFAULT NULL                        COMMENT '发布人',
  `level`           VARCHAR(8)      DEFAULT 'M'                         COMMENT '通知等级(L:低, M:中, H:高)',
  `target_type`     TINYINT         DEFAULT 1                           COMMENT '目标类型(1:全体, 2:指定)',
  `target_user_ids` VARCHAR(2000)   DEFAULT NULL                        COMMENT '目标用户ID集合(逗号分隔)',
  `publish_status`  TINYINT         DEFAULT 0                           COMMENT '发布状态(0:未发布, 1:已发布, -1:已撤回)',
  `publish_time`    DATETIME        DEFAULT NULL                        COMMENT '发布时间',
  `revoke_time`     DATETIME        DEFAULT NULL                        COMMENT '撤回时间',
  `is_deleted`      TINYINT         DEFAULT 0                           COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `create_by`       BIGINT UNSIGNED DEFAULT NULL                        COMMENT '创建人ID',
  `update_by`       BIGINT UNSIGNED DEFAULT NULL                        COMMENT '更新人ID',
  `create_time`     DATETIME        DEFAULT CURRENT_TIMESTAMP            COMMENT '创建时间',
  `update_time`     DATETIME        DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_publish_status` (`publish_status`),
  KEY `idx_publisher_id`   (`publisher_id`),
  KEY `idx_create_time`    (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知公告表';

-- ============================================================
--  13. sys_user_notice  用户-通知 关联表
--       继承 BaseEntity(@TableId AUTO 重写)
--       注意:没有 create_by / update_by(BaseEntity 也没有)
-- ============================================================
CREATE TABLE `sys_user_notice` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT                COMMENT '主键ID',
  `notice_id`   BIGINT UNSIGNED NOT NULL                               COMMENT '公共通知id',
  `user_id`     BIGINT UNSIGNED NOT NULL                               COMMENT '用户id',
  `is_read`     TINYINT         DEFAULT 0                              COMMENT '读取状态(0-未读, 1-已读)',
  `read_time`   DATETIME        DEFAULT NULL                           COMMENT '用户阅读时间',
  `is_deleted`  TINYINT         DEFAULT 0                              COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  `create_time` DATETIME        DEFAULT CURRENT_TIMESTAMP               COMMENT '创建时间',
  `update_time` DATETIME        DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_notice_id` (`notice_id`),
  KEY `idx_user_id`   (`user_id`),
  KEY `idx_is_read`   (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-通知公告关联表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  验证(可选,执行后应有 13 张表)
--  SHOW TABLES LIKE 'sys_%';
-- ============================================================
