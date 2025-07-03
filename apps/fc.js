import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import moment from 'moment'

// 加载配置文件
const configPath = path.join(process.cwd(), '../../../config.yaml')
let config = {}
if (fs.existsSync(configPath)) {
  config = (await import(configPath)).default
} else {
  // 默认配置
  config = {
    enableGroupRecall: true,      // 启用群聊撤回监控
    enableFriendRecall: true,     // 启用好友撤回监控
    sendToOwner: true,            // 将好友撤回发送给主人
    saveToFile: true,             // 保存撤回记录到文件
    logPath: './data/recall-logs/' // 日志存储路径
  }
  // 创建默认配置文件
  fs.writeFileSync(configPath, `export default ${JSON.stringify(config, null, 2)}`)
}

// 确保日志目录存在
if (config.saveToFile && !fs.existsSync(config.logPath)) {
  fs.mkdirSync(config.logPath, { recursive: true })
}

export class RecallMonitor extends plugin {
  constructor() {
    super({
      name: '消息防撤回',
      dsc: '监控群聊和好友的撤回消息',
      event: 'notice',
      priority: 5000
    })
  }

  async accept() {
    // 监听群聊撤回事件
    if (config.enableGroupRecall) {
      this.groupRecall()
    }
    
    // 监听好友撤回事件
    if (config.enableFriendRecall) {
      this.friendRecall()
    }
  }

  // 处理群聊撤回
  async groupRecall(e) {
    if (e.notice_type !== 'group_recall') return
    
    try {
      const msg = await e.bot.getMsg(e.message_id)
      if (!msg) return
      
      const recallInfo = {
        type: 'group',
        group_id: e.group_id,
        group_name: e.group_name,
        user_id: e.user_id,
        nickname: e.nickname,
        message_id: e.message_id,
        message: msg.message,
        raw_message: msg.raw_message,
        time: moment.unix(msg.time).format('YYYY-MM-DD HH:mm:ss'),
        recall_time: moment().format('YYYY-MM-DD HH:mm:ss')
      }
      
      // 保存记录
      this.saveRecallLog(recallInfo)
      
      // 控制台日志
      console.log(`[群聊撤回监控] 群: ${recallInfo.group_name}(${recallInfo.group_id})`)
      console.log(`用户: ${recallInfo.nickname}(${recallInfo.user_id})`)
      console.log(`时间: ${recallInfo.time}`)
      console.log(`内容: ${recallInfo.message}`)
      
    } catch (err) {
      console.error('群聊撤回监控出错:', err)
    }
  }

  // 处理好友撤回
  async friendRecall(e) {
    if (e.notice_type !== 'friend_recall') return
    
    try {
      const msg = await e.bot.getMsg(e.message_id)
      if (!msg) return
      
      const recallInfo = {
        type: 'friend',
        user_id: e.user_id,
        nickname: e.nickname,
        message_id: e.message_id,
        message: msg.message,
        raw_message: msg.raw_message,
        time: moment.unix(msg.time).format('YYYY-MM-DD HH:mm:ss'),
        recall_time: moment().format('YYYY-MM-DD HH:mm:ss')
      }
      
      // 保存记录
      this.saveRecallLog(recallInfo)
      
      // 控制台日志
      console.log(`[好友撤回监控] 好友: ${recallInfo.nickname}(${recallInfo.user_id})`)
      console.log(`时间: ${recallInfo.time}`)
      console.log(`内容: ${recallInfo.message}`)
      
      // 发送给主人
      if (config.sendToOwner && e.bot.fl.get('master')) {
        const owner_id = e.bot.config.ownerQQ
        if (owner_id) {
          const message = [
            `📢 检测到好友撤回消息！`,
            `👤 好友: ${recallInfo.nickname}(${recallInfo.user_id})`,
            `⏰ 发送时间: ${recallInfo.time}`,
            `📝 内容: ${recallInfo.message}`
          ].join('\n')
          
          e.bot.pickUser(owner_id).sendMsg(message)
        }
      }
      
    } catch (err) {
      console.error('好友撤回监控出错:', err)
    }
  }

  // 保存撤回记录到文件
  saveRecallLog(data) {
    if (!config.saveToFile) return
    
    try {
      const date = moment().format('YYYY-MM-DD')
      const logFile = path.join(config.logPath, `recall-${date}.log`)
      
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        data
      }) + '\n'
      
      fs.appendFileSync(logFile, logEntry)
    } catch (err) {
      console.error('保存撤回记录失败:', err)
    }
  }
}