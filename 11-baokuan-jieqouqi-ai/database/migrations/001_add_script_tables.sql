-- TOM-217: 脚本管理表结构迁移脚本
-- 创建时间: 2025-07-12
-- Schema: baokuan_app

-- 切换到正确的schema
SET search_path TO baokuan_app;

-- 1. 创建脚本主表
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    card_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    
    -- 添加外键约束
    CONSTRAINT fk_scripts_card_id FOREIGN KEY (card_id) REFERENCES "AnalysisCard"(id) ON DELETE CASCADE,
    CONSTRAINT fk_scripts_created_by FOREIGN KEY (created_by) REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- 添加约束
    CONSTRAINT chk_scripts_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_scripts_title_length CHECK (LENGTH(title) >= 1)
);

-- 2. 创建脚本段落表
CREATE TABLE IF NOT EXISTS script_sections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    script_id TEXT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tips JSONB DEFAULT '[]'::jsonb,
    time_range VARCHAR(50),
    importance VARCHAR(20) NOT NULL DEFAULT 'medium',
    order_index INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 添加外键约束
    CONSTRAINT fk_script_sections_script_id FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    
    -- 添加约束
    CONSTRAINT chk_section_type CHECK (section_type IN ('hook', 'problem', 'solution', 'proof', 'cta')),
    CONSTRAINT chk_importance CHECK (importance IN ('low', 'medium', 'high')),
    CONSTRAINT chk_order_index CHECK (order_index >= 1 AND order_index <= 100),
    CONSTRAINT chk_content_length CHECK (LENGTH(content) >= 1),
    CONSTRAINT chk_title_length CHECK (LENGTH(title) >= 1),
    
    -- 唯一约束：一个脚本中每种类型的段落只能有一个
    CONSTRAINT uk_script_sections_script_type UNIQUE (script_id, section_type),
    -- 唯一约束：一个脚本中每个排序位置只能有一个段落
    CONSTRAINT uk_script_sections_script_order UNIQUE (script_id, order_index)
);

-- 3. 创建脚本编辑历史表
CREATE TABLE IF NOT EXISTS script_edit_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    script_id TEXT NOT NULL,
    section_id TEXT,
    content_before TEXT,
    content_after TEXT,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    
    -- 添加外键约束
    CONSTRAINT fk_script_edit_history_script_id FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    CONSTRAINT fk_script_edit_history_section_id FOREIGN KEY (section_id) REFERENCES script_sections(id) ON DELETE SET NULL,
    CONSTRAINT fk_script_edit_history_created_by FOREIGN KEY (created_by) REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- 添加约束
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'generate')),
    -- 对于非删除操作，content_after不能为空
    CONSTRAINT chk_content_after CHECK (
        action = 'delete' OR 
        (action != 'delete' AND content_after IS NOT NULL AND LENGTH(content_after) > 0)
    )
);

-- 4. 创建索引以提升查询性能
-- 脚本表索引
CREATE INDEX IF NOT EXISTS idx_scripts_card_id ON scripts(card_id);
CREATE INDEX IF NOT EXISTS idx_scripts_created_by ON scripts(created_by);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at);
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON scripts(updated_at);

-- 脚本段落表索引
CREATE INDEX IF NOT EXISTS idx_script_sections_script_id ON script_sections(script_id);
CREATE INDEX IF NOT EXISTS idx_script_sections_section_type ON script_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_script_sections_order_index ON script_sections(script_id, order_index);
CREATE INDEX IF NOT EXISTS idx_script_sections_updated_at ON script_sections(updated_at);

-- 脚本编辑历史表索引
CREATE INDEX IF NOT EXISTS idx_script_edit_history_script_id ON script_edit_history(script_id);
CREATE INDEX IF NOT EXISTS idx_script_edit_history_section_id ON script_edit_history(section_id);
CREATE INDEX IF NOT EXISTS idx_script_edit_history_created_by ON script_edit_history(created_by);
CREATE INDEX IF NOT EXISTS idx_script_edit_history_created_at ON script_edit_history(created_at);
CREATE INDEX IF NOT EXISTS idx_script_edit_history_action ON script_edit_history(action);

-- 5. 创建更新时间自动更新触发器
-- 脚本表的updated_at自动更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为scripts表创建触发器
DROP TRIGGER IF EXISTS update_scripts_updated_at ON scripts;
CREATE TRIGGER update_scripts_updated_at
    BEFORE UPDATE ON scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为script_sections表创建触发器
DROP TRIGGER IF EXISTS update_script_sections_updated_at ON script_sections;
CREATE TRIGGER update_script_sections_updated_at
    BEFORE UPDATE ON script_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 添加表和列注释
COMMENT ON TABLE scripts IS '脚本主表 - 存储脚本的基本信息';
COMMENT ON COLUMN scripts.id IS '脚本唯一标识符';
COMMENT ON COLUMN scripts.card_id IS '关联的分析卡片ID';
COMMENT ON COLUMN scripts.title IS '脚本标题';
COMMENT ON COLUMN scripts.status IS '脚本状态: draft(草稿), published(已发布), archived(已归档)';
COMMENT ON COLUMN scripts.created_by IS '创建者用户ID';

COMMENT ON TABLE script_sections IS '脚本段落表 - 存储脚本的五个段落内容';
COMMENT ON COLUMN script_sections.section_type IS '段落类型: hook(钩子), problem(问题), solution(方案), proof(证明), cta(召唤)';
COMMENT ON COLUMN script_sections.importance IS '重要性级别: low(低), medium(中), high(高)';
COMMENT ON COLUMN script_sections.order_index IS '段落排序索引，1-5分别对应五个段落';
COMMENT ON COLUMN script_sections.tips IS 'JSON格式的创作提示数组';

COMMENT ON TABLE script_edit_history IS '脚本编辑历史表 - 记录所有编辑操作的审计日志';
COMMENT ON COLUMN script_edit_history.action IS '操作类型: create(创建), update(更新), delete(删除), generate(生成)';
COMMENT ON COLUMN script_edit_history.content_before IS '修改前的内容';
COMMENT ON COLUMN script_edit_history.content_after IS '修改后的内容';

-- 7. 创建用于检查表结构的视图
CREATE OR REPLACE VIEW script_management_tables_info AS
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'baokuan_app' 
  AND table_name IN ('scripts', 'script_sections', 'script_edit_history')
ORDER BY table_name, ordinal_position;

COMMENT ON VIEW script_management_tables_info IS 'TOM-217脚本管理表结构信息视图';

-- 8. 验证表创建成功
DO $$ 
DECLARE
    script_count INTEGER;
    section_count INTEGER;
    history_count INTEGER;
BEGIN
    -- 检查表是否存在
    SELECT COUNT(*) INTO script_count 
    FROM information_schema.tables 
    WHERE table_schema = 'baokuan_app' AND table_name = 'scripts';
    
    SELECT COUNT(*) INTO section_count 
    FROM information_schema.tables 
    WHERE table_schema = 'baokuan_app' AND table_name = 'script_sections';
    
    SELECT COUNT(*) INTO history_count 
    FROM information_schema.tables 
    WHERE table_schema = 'baokuan_app' AND table_name = 'script_edit_history';
    
    IF script_count = 1 AND section_count = 1 AND history_count = 1 THEN
        RAISE NOTICE '✅ TOM-217脚本管理表创建成功: scripts, script_sections, script_edit_history';
    ELSE
        RAISE EXCEPTION '❌ TOM-217脚本管理表创建失败，请检查权限和数据库连接';
    END IF;
END $$;