#!/bin/bash
echo "🔄 重启服务器..."

# 停止旧服务器
pkill -f "uvicorn backend.api:app"
sleep 2

# 启动新服务器
nohup python3 -m uvicorn backend.api:app --reload --host 0.0.0.0 --port 8000 > /tmp/claude/-Users-mac-Documents-Claude-Code/tasks/server.log 2>&1 &

echo "⏳ 等待服务器启动..."
sleep 3

# 测试服务器
if curl -s http://127.0.0.1:8000/api/health > /dev/null; then
    echo "✅ 服务器启动成功！"
    echo ""
    echo "📱 请在浏览器中访问："
    echo "   http://127.0.0.1:8000"
    echo ""
    echo "💡 提示：按 Cmd+Shift+R 强制刷新浏览器"
else
    echo "❌ 服务器启动失败，请查看日志："
    tail -20 /tmp/claude/-Users-mac-Documents-Claude-Code/tasks/server.log
fi
