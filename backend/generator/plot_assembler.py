import json
import random
from typing import Dict, List, Optional


class PlotAssembler:
    """情节组装器 - 从模板库中提取和组装情节"""

    def __init__(self, template_path: str = "backend/templates/plot_library.json"):
        """
        初始化

        Args:
            template_path: 模板库文件路径
        """
        with open(template_path, 'r', encoding='utf-8') as f:
            self.templates = json.load(f)

    def get_template(self, category: str, subcategory: str, name: Optional[str] = None) -> Dict:
        """
        获取指定模板

        Args:
            category: 主分类（如"出轨"）
            subcategory: 子分类（如"discovery_scene"）
            name: 模板名称（可选，不指定则随机返回）

        Returns:
            模板字典
        """
        templates = self.templates["plot_modules"].get(category, {}).get(subcategory, [])

        if not templates:
            return {}

        if name:
            for t in templates:
                if t["name"] == name:
                    return t
            return {}

        return random.choice(templates)

    def fill_template(self, template: Dict, variables: Dict) -> str:
        """
        填充模板变量

        Args:
            template: 模板字典
            variables: 变量字典

        Returns:
            填充后的文本
        """
        text = template["template"]
        for var in template.get("variables", []):
            var_name = var["name"]
            value = variables.get(var_name, var.get("default", ""))
            text = text.replace(f"{{{var_name}}}", str(value))

        return text

    def assemble_plot(
        self,
        elements: List[str],
        characters: Dict,
        custom_vars: Optional[Dict] = None
    ) -> List[Dict]:
        """
        组装情节序列

        Args:
            elements: 必须包含的元素（如["出轨", "掉马", "假死"]）
            characters: 人物设定 {"主角": "姓名", "男主": "姓名", ...}
            custom_vars: 自定义变量

        Returns:
            情节序列列表 [{"scene": "", "content": "", "elements": []}]
        """
        if custom_vars is None:
            custom_vars = {}

        plots = []

        # 为每个元素选择情节模板
        for element in elements:
            if element in self.templates["plot_modules"]:
                # 获取该元素的所有子分类
                element_data = self.templates["plot_modules"][element]

                # 从每个子分类中随机选择一个模板
                for subcategory, templates in element_data.items():
                    if isinstance(templates, list) and templates:
                        template = random.choice(templates)
                        content = self.fill_template(template, {**custom_vars, **characters})

                        plots.append({
                            "element": element,
                            "subcategory": subcategory,
                            "template_name": template["name"],
                            "content": content,
                            "order": len(plots)
                        })

        # 按照合理顺序排序（出轨 -> 假死 -> 掉马 -> 复仇 -> 追妻）
        priority_order = {"出轨": 1, "假死": 2, "掉马": 3, "豪门恩怨": 4, "追妻火葬场": 5}
        plots.sort(key=lambda x: priority_order.get(x["element"], 99))

        return plots

    def generate_scene_sequence(self, elements: List[str]) -> List[Dict]:
        """
        生成场景序列大纲

        Args:
            elements: 包含的元素

        Returns:
            场景序列
        """
        # 根据元素生成合理的场景顺序
        sequence = []

        if "出轨" in elements:
            sequence.append({
                "type": "opening",
                "title": "发现真相",
                "element": "出轨",
                "description": "主角发现出轨/背叛的事实"
            })

        if "假死" in elements:
            sequence.append({
                "type": "development",
                "title": "绝望离去",
                "element": "假死",
                "description": "主角制造假死，离开所有人"
            })

        if "掉马" in elements or "豪门" in elements:
            sequence.append({
                "type": "climax",
                "title": "身份揭晓",
                "element": "掉马",
                "description": "主角的真实身份被揭露"
            })

        if "追妻火葬场" in elements:
            sequence.append({
                "type": "ending",
                "title": "后悔莫及",
                "element": "追妻火葬场",
                "description": "男主后悔，试图挽回"
            })

        return sequence

    def suggest_characters(self, elements: List[str]) -> Dict:
        """
        根据元素建议人物设定

        Args:
            elements: 包含的元素

        Returns:
            人物建议
        """
        base_chars = {
            "主角": {"gender": "女", "role": "女主"},
            "男主": {"gender": "男", "role": "男主/渣男"},
        }

        if "掉马" in elements or "豪门" in elements:
            base_chars["主角"]["identity"] = "豪门继承人/神秘大佬"

        if "追妻火葬场" in elements:
            base_chars["男主"]["fate"] = "后期追妻火葬场"

        if "错认性别" in elements:
            base_chars["主角"]["disguise"] = "女扮男装/男扮女装"

        return base_chars
