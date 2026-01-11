# 人机协作写作系统 - API使用指南

## 概述

新的人机协作写作系统支持**细粒度的分步创作流程**，强调人工创作与AI辅助的平衡，避免纯AI生成稿件被识别的问题。

## 核心设计理念

### 1. 分步创作，而非一键生成
- 不再一次性生成全部内容
- 每个步骤都可以人工调整
- 保留足够的"人工痕迹"

### 2. 人机协作比例追踪
- 记录人工编辑次数
- 记录AI润色次数
- 计算人机创作比例

### 3. 细粒度控制
- 人物设定（手动创建 + AI辅助）
- 情节大纲（逐章规划）
- 章节生成（逐章生成，可调整参数）

---

## 数据模型

### 1. Character（人物表）
支持精细化的角色管理：

```json
{
  "id": 1,
  "project_id": 1,
  "name": "张三",
  "role_type": "protagonist",  // protagonist, antagonist, supporting
  "age": 28,
  "gender": "男",
  "appearance": "外貌描述",
  "personality": "性格特点",
  "background": "背景故事",
  "motivation": "核心动机",
  "secret": "隐藏秘密（用于反转）",
  "speech_pattern": "语言风格描述",
  "behavior_habits": "行为习惯",
  "emotional_triggers": "情绪触发点",
  "relationships": [],
  "source": "manual",  // manual or ai_generated
  "notes": "备注"
}
```

### 2. PlotOutline（情节大纲表）
支持分层的情节管理：

```json
{
  "id": 1,
  "project_id": 1,
  "level": "chapter",  // story, chapter, scene
  "parent_id": null,
  "chapter_number": 1,
  "title": "第一章标题",
  "summary": "章节摘要",
  "plot_points": ["情节要点1", "情节要点2"],
  "target_words": 2000,
  "focus_elements": ["强人设", "情绪钩子"],
  "emotion_arc": "从愤怒到冷静",
  "characters_involved": ["主角", "反派"],
  "status": "draft",  // draft, ready, generated
  "source": "manual",
  "order": 1
}
```

### 3. ChapterDraft（章节草稿表）
支持章节草稿和编辑记录：

```json
{
  "id": 1,
  "project_id": 1,
  "outline_id": 1,
  "chapter_number": 1,
  "title": "第一章标题",
  "content": "章节内容...",
  "word_count": 2345,
  "status": "draft",  // draft, generating, revising, completed
  "edit_count": 3,  // 人工编辑次数
  "ai_revision_count": 1,  // AI润色次数
  "human_ai_ratio": "70:30",  // 人机创作比例
  "generation_params": {
    "temperature": 0.8,
    "focus": "情绪钩子"
  },
  "notes": "写作笔记",
  "issues": "需要加强情绪描写"
}
```

---

## API端点详解

### 人物管理API

#### 1. 获取项目人物列表
```
GET /api/projects/{project_id}/characters
```

**响应示例：**
```json
{
  "characters": [
    {
      "id": 1,
      "name": "李明",
      "role_type": "protagonist",
      "age": 25,
      "personality": "倔强，不服输",
      "speech_pattern": "说话简短有力，喜欢反问",
      "source": "manual"
    }
  ]
}
```

#### 2. 手动创建人物
```
POST /api/characters
Content-Type: application/json

{
  "project_id": 1,
  "name": "王芳",
  "role_type": "supporting",
  "age": 30,
  "personality": "温柔细腻",
  "speech_pattern": "语速缓慢，常用叠词",
  "motivation": "保护家人",
  "secret": "其实是主角的亲生母亲"
}
```

#### 3. AI辅助生成人物
```
POST /api/characters/generate
Content-Type: application/json

{
  "project_id": 1,
  "role_type": "antagonist",
  "theme": "家庭财产纠纷",
  "elements": ["强人设", "心机深沉", "隐藏身份"],
  "reference": "要像《知否》里的林小娘一样表面温柔"
}
```

**AI会自动生成：**
- 姓名
- 外貌描述
- 性格特点
- 背景故事
- 核心动机
- 隐藏秘密（用于反转）
- 语言风格（便于AI生成对话时模仿）

#### 4. 更新人物
```
PUT /api/characters/{character_id}
```

#### 5. 删除人物
```
DELETE /api/characters/{character_id}
```

---

### 情节大纲管理API

#### 1. 获取项目大纲列表
```
GET /api/projects/{project_id}/outlines?level=chapter
```

**查询参数：**
- `level`: 可选，过滤层级（story/chapter/scene）

**响应示例：**
```json
{
  "outlines": [
    {
      "id": 1,
      "level": "chapter",
      "chapter_number": 1,
      "title": "暴雨夜的冲突",
      "summary": "主角发现二舅转移财产，两人发生激烈冲突",
      "plot_points": [
        "主角发现银行流水",
        "与二舅对质",
        "二舅扇了主角一巴掌",
        "主角耳鸣，决定反击"
      ],
      "target_words": 2500,
      "focus_elements": ["情绪钩子", "强冲突"],
      "emotion_arc": "从震惊到愤怒，再到清醒",
      "characters_involved": ["主角", "二舅"],
      "status": "draft"
    }
  ]
}
```

#### 2. 创建情节大纲
```
POST /api/outlines
Content-Type: application/json

{
  "project_id": 1,
  "level": "chapter",
  "chapter_number": 1,
  "title": "第一章：发现真相",
  "summary": "主角偶然发现二舅转移财产的证据",
  "plot_points": [
    "主角在书房发现文件",
    "文件显示财产已被转移",
    "主角质问二舅",
    "二舅否认，两人争执"
  ],
  "target_words": 2000,
  "focus_elements": ["强冲突", "信息差"],
  "emotion_arc": "从疑惑到震惊再到愤怒",
  "characters_involved": ["主角", "二舅"]
}
```

#### 3. 更新大纲
```
PUT /api/outlines/{outline_id}
```

#### 4. 删除大纲
```
DELETE /api/outlines/{outline_id}
```

---

### 章节草稿管理API

#### 1. 根据大纲生成章节
```
POST /api/chapters/generate
Content-Type: application/json

{
  "outline_id": 1,
  "temperature": 0.8,
  "focus": "情绪钩子"
}
```

**生成特点：**
- 根据大纲的情节要点生成内容
- 自动调用涉及人物的语言风格
- 可调整temperature（创造性）
- 可指定focus（如：情绪钩子、细节描写等）

**响应示例：**
```json
{
  "success": true,
  "chapter_id": 1,
  "content": "章节内容...",
  "word_count": 2345
}
```

#### 2. 获取项目章节列表
```
GET /api/projects/{project_id}/chapters
```

**响应示例：**
```json
{
  "chapters": [
    {
      "id": 1,
      "outline_id": 1,
      "chapter_number": 1,
      "title": "第一章：发现真相",
      "content": "章节内容...",
      "word_count": 2345,
      "status": "draft",
      "edit_count": 2,
      "ai_revision_count": 1,
      "human_ai_ratio": "70:30"
    }
  ]
}
```

#### 3. 更新章节内容（人工编辑）
```
PUT /api/chapters/{chapter_id}?content=新内容&notes=修改说明
```

**特点：**
- 自动记录编辑次数
- 计算人机创作比例

#### 4. AI润色章节
```
POST /api/chapters/{chapter_id}/revise
Content-Type: application/json

{
  "focus": "情绪钩子",
  "style": "播报员口吻",
  "instructions": "加强主角愤怒时的细节描写"
}
```

**润色特点：**
- 保持原有剧情
- 重点优化指定方面
- 记录AI润色次数
- 更新人机比例

---

## 推荐的创作流程

### 第一阶段：项目设定
1. 创建项目（已有API）
2. 手动输入核心要素：
   - 主题
   - 核心冲突
   - 核心任务

### 第二阶段：人物设计
1. **手动创建主角**：根据你的构思创建主角
   ```
   POST /api/characters
   - 设定主角的基本信息
   - 设定语言风格（重要！用于后续AI生成对话）
   ```

2. **AI辅助生成配角/反派**：
   ```
   POST /api/characters/generate
   - 让AI生成有特色的配角
   - 检查AI生成的"秘密"字段（用于反转）
   - 根据需要调整
   ```

### 第三阶段：情节大纲
1. **逐章创建大纲**：
   ```
   POST /api/outlines
   - 手动输入每章的情节要点
   - 设定情绪弧线
   - 标记涉及的人物
   - 设定重点元素
   ```

2. **检查连贯性**：
   - 确保各章大纲连贯
   - 情绪弧线有起伏
   - 反转点有铺垫

### 第四阶段：章节生成与编辑
1. **逐章生成**：
   ```
   POST /api/chapters/generate
   - 一次只生成一章
   - 根据大纲生成
   - 检查生成结果
   ```

2. **人工编辑（重要！）**：
   ```
   PUT /api/chapters/{chapter_id}
   - 修改不符合人设的对话
   - 调整节奏
   - 增加细节
   - 这一步是"去AI化"的关键
   ```

3. **AI润色（可选）**：
   ```
   POST /api/chapters/{chapter_id}/revise
   - 针对性润色（如：情绪钩子）
   - 保持人工修改的内容
   - 记录润色次数
   ```

### 第五阶段：整体调整
1. 查看人机比例
2. 确保有足够的人工编辑
3. 必要时进行最后一轮人工润色

---

## 人机协作比例建议

为了降低被识别为AI生成稿的风险，建议：

### 推荐比例：70%人工 : 30%AI

**如何达成：**

1. **大纲层面（100%人工）**
   - 所有大纲手动创建
   - 情节要点自己设计
   - 人物关系自己设定

2. **初稿层面（50%人工 + 50%AI）**
   - AI生成初稿
   - 立即进行大量人工修改：
     - 改写对话
     - 调整描述
     - 增加细节
     - 修改节奏

3. **润色层面（80%人工 + 20%AI）**
   - 主要依靠人工润色
   - AI仅用于个别段落调整

**操作示例：**
```
# AI生成初稿（约2000字）
POST /api/chapters/generate

# 人工大幅修改（改写至少60%的内容）
PUT /api/chapters/{chapter_id}
content: 人工重写了大部分内容...

# 可选：AI针对性润色（如情绪描写）
POST /api/chapters/{chapter_id}/revise
focus: "情绪钩子"
```

---

## 最佳实践

### 1. 人物语言风格要具体
❌ 不好：
```json
{
  "speech_pattern": "说话很拽"
}
```

✅ 好：
```json
{
  "speech_pattern": "喜欢用反问句，语速快，经常打断别人，常说'你以为呢？'、'哈？'、'那又怎样？'"
}
```

### 2. 大纲情节要详细
❌ 不好：
```json
{
  "plot_points": ["主角和反派吵架"]
}
```

✅ 好：
```json
{
  "plot_points": [
    "主角在书房找到银行转账记录",
    "拿着记录去质问二舅",
    "二舅说'关你什么事'",
    "主角说'那是妈的钱'",
    "二舅突然暴怒，扇了主角一巴掌",
    "主角耳鸣，摔倒在地"
  ]
}
```

### 3. 情绪弧线要清晰
❌ 不好：
```json
{
  "emotion_arc": "情绪波动"
}
```

✅ 好：
```json
{
  "emotion_arc": "从疑惑（发现文件）→震惊（看到金额）→愤怒（质问被扇）→耳鸣（生理反应）→清醒（决定反击）"
}
```

### 4. 人工编辑要充分
AI生成后，至少要进行：
1. 对话修改（确保符合人设）
2. 描写调整（增加个人风格）
3. 节奏调整（AI容易写得太平）
4. 细节补充（AI容易空洞）

---

## 常见问题

### Q: AI生成的人物语言风格不够具体怎么办？
A: 人工编辑人物设定，添加更具体的描述。可以参考经典角色的说话方式。

### Q: AI生成的章节太长了怎么办？
A: 在大纲中设定`target_words`，或者在生成后人工删减。

### Q: 如何确保人机创作比例？
A: 系统会自动记录`edit_count`和`ai_revision_count`，并计算`human_ai_ratio`。

### Q: 可以多次AI润色吗？
A: 可以，但建议不超过3次，否则AI痕迹会越来越重。

### Q: 人工编辑后，AI润色会改回来吗？
A: 不会。AI润色会保留你修改的内容，只是进行针对性优化。

---

## 总结

新的人机协作系统：

✅ **分步创作** - 每步都可调整
✅ **人工主导** - 大纲、人物设定主要靠人工
✅ **AI辅助** - 用于生成初稿和针对性润色
✅ **比例追踪** - 记录人机创作比例
✅ **去AI化** - 通过大量人工编辑降低识别风险

**记住：** 好的小说是人和AI协作的结果，而不是AI独自的产物。
