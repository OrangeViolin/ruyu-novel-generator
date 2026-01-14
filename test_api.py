#!/usr/bin/env python3
"""
测试灵感生成API的脚本
"""
import requests
import json

url = "http://127.0.0.1:8000/api/inspiration/generate-settings"

data = {
    "summary": "天才机械少年林黯，为偿还巨额债务，被迫为阳光却困于轮椅的富家少女苏曦制作外骨骼",
    "readers": "young_adult",
    "genre": "scifi",
    "chapters": "10",
    "words": "30000",
    "elements": ""
}

print("发送请求到:", url)
print("请求数据:", json.dumps(data, ensure_ascii=False, indent=2))
print("\n" + "="*50 + "\n")

try:
    response = requests.post(url, json=data, timeout=120)

    print(f"HTTP状态码: {response.status_code}")
    print(f"响应时间: {response.elapsed.total_seconds()}秒")

    if response.status_code == 200:
        result = response.json()
        print("\n成功！")
        print(f"返回数据键: {list(result.keys())}")
        if 'data' in result:
            print(f"数据包含: {list(result['data'].keys())}")
    else:
        print(f"\n错误响应:")
        print(response.text)

except Exception as e:
    print(f"\n请求失败: {e}")
