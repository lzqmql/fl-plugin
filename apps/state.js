import os from 'os'
import { execSync } from 'child_process'

export class ServerStatus extends plugin {
  constructor() {
    super({
      name: '服务器状态',
      dsc: '获取Linux服务器状态信息',
      event: 'message',
      priority: -9995000,
      rule: [
        {
          reg: '^#?(风铃状态)$',
          fnc: 'getStatus'
        }
      ]
    })
  }

  async getStatus(e) {
    try {
      // 获取系统信息
      const uptime = this.formatUptime(os.uptime())
      const hostname = os.hostname()
      const platform = os.platform()
      const arch = os.arch()
      
      // 获取CPU信息
      const cpuModel = this.getCpuModel()
      const cpuUsage = await this.getCpuUsage()
      
      // 获取内存信息
      const memory = this.getMemoryUsage()
      
      // 获取磁盘信息
      const disk = this.getDiskUsage()
      
      // 获取负载信息
      const load = os.loadavg().map(v => v.toFixed(2)).join(', ')
      
      // 构建回复消息
      let msg = `服务器状态 \n`
      msg += ` 主机名: ${hostname}\n`
      msg += ` 系统: ${platform} ${arch}\n`
      msg += ` 运行时间: ${uptime}\n`
      msg += ` CPU: ${cpuModel}\n`
      msg += ` CPU使用率: ${cpuUsage}%\n`
      msg += ` 平均负载: ${load}\n`
      msg += ` 内存: ${memory.used}MB/${memory.total}MB (${memory.percent}%)\n`
      
      await e.reply(msg)
      return true
    } catch (err) {
      console.error('获取服务器状态失败:', err)
      await e.reply('获取服务器状态失败，请检查日志')
      return false
    }
  }

  // 格式化运行时间
  formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24))
    const hours = Math.floor((seconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}天 ${hours}小时 ${minutes}分钟`
  }

  // 获取CPU型号
  getCpuModel() {
    try {
      const output = execSync('cat /proc/cpuinfo | grep "model name" | uniq | cut -d: -f2').toString().trim()
      return output || '未知CPU'
    } catch {
      return os.cpus()[0].model
    }
  }

  // 获取CPU使用率
  async getCpuUsage() {
    return new Promise((resolve) => {
      const stats1 = this.getCpuStats()
      setTimeout(() => {
        const stats2 = this.getCpuStats()
        const idleDiff = stats2.idle - stats1.idle
        const totalDiff = stats2.total - stats1.total
        const usage = 100 - Math.round((idleDiff / totalDiff) * 100)
        resolve(usage)
      }, 1000)
    })
  }

  // 获取CPU状态数据
  getCpuStats() {
    const cpus = os.cpus()
    let idle = 0
    let total = 0
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        total += cpu.times[type]
      }
      idle += cpu.times.idle
    })
    
    return { idle, total }
  }

  // 获取内存使用情况
  getMemoryUsage() {
    const total = Math.round(os.totalmem() / (1024 * 1024))
    const free = Math.round(os.freemem() / (1024 * 1024))
    const used = total - free
    const percent = Math.round((used / total) * 100)
    return { total, used, percent }
  }

  // 获取磁盘使用情况
  getDiskUsage() {
    try {
      const output = execSync('df -BG / | awk \'NR==2{print $2,$3,$5}\'').toString().split(/\s+/)
      return {
        total: parseInt(output[1]),
        used: parseInt(output[2]),
        percent: parseInt(output[3])
      }
    } catch (err) {
      console.error('获取磁盘信息失败:', err)
      return { total: 0, used: 0, percent: 0 }
    }
  }
}