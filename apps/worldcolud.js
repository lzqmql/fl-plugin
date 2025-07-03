import plugin from "../../../lib/plugins/plugin.js"
import moment from "moment"
import lodash from "lodash"
import common from "../../../lib/common/common.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"

let issqtj = false
export default class worldColud extends plugin {
  constructor() {
    super({
      name: "worldcolud",
      priority: 50,
      rule: [
        {
          reg: "^(#|)(前日|今日|昨日)发言记录$",
          fnc: "usermsg"
        },
        {
          reg: "^#?水群统计$",
          fnc: "sqtj"
        }
      ]
    })
    this._path = process.cwd().replace(/\\/g, '/')
  }

  get Bot() {
    return this.e.bot ?? Bot
  }

  async usermsg(e) {
    let day = "今日"
    day = e.msg.replace(/#|发言记录/g, "") || "今日"
    e.reply(`正在查找${day}发言记录......`)
    let Cfg = { isMsgInfo: true }
    let time = {
      昨日: 1,
      前日: 2
    }
    let startTime = moment().hour(0).minute(0).second(0)
    let endTime = moment()
    if (day !== "今日") {
      startTime = moment().subtract(time[day], "days").hour(0).minute(0).second(0)
      endTime = moment(startTime).add(1, "days").hour(0).minute(0).second(0)
    }
    let groupMsglist = await this.getGroupHistoryMsg(startTime, endTime, Cfg)
    let user_id = e.user_id
    if (e.at) user_id = e.at
    groupMsglist[user_id].msglist.forEach((item, index) => {
      item.content.forEach((cont) => {
        if (cont.type == "file") groupMsglist[user_id].msglist[index] = { content: { type: "text", text: "[文件消息不支持查看！]" }, time: item.time }
      })
    })
    let msg = groupMsglist[user_id].msglist
    let forwardMsg = []
    for (let i = 1; i < msg.length + 1; i++) {
      forwardMsg.push(msg[i - 1].content[0])
    }
    return await e.reply(common.makeForwardMsg(e, forwardMsg, `${day}发言记录`, true))
  }

  async sqtj(e) {
    if (issqtj) return await e.reply("还在统计中，请勿重复发出指令！")
    this.reply("正在分析今日的聊天记录，稍后生成榜单......")
    issqtj = true
    let startTime = ""
    let endTime = ""
    let Cfg = { iscountBot: true, iscountAll: true, iscountByDay: false }
    let groupMsglist
    if (!groupMsglist) groupMsglist = await this.getGroupHistoryMsg(startTime, endTime, Cfg)
    let groupmemberlist = await e.group.getMemberMap()
    let memberlist = []
    for (let m of groupmemberlist) {
      memberlist.push(m[1])
    }
    memberlist = lodash.orderBy(memberlist, "last_sent_time", "asc")
    moment.locale("zh-cn")
    memberlist[0].lastmsgtime = moment.unix(memberlist[0].last_sent_time).fromNow().replace(/\s*/g, "")
    let CharArray = []
    for (const key in groupMsglist) {
      if (key == "allcount" || key == "botcount") continue
      CharArray.push(groupMsglist[key])
    }
    CharArray.sort((a, b) => {
      return b.times - a.times
    })
    let bclist = lodash.orderBy(CharArray, "facestime", "desc")
    CharArray = CharArray.slice(0, CharArray.length > 10 ? 10 : CharArray.length)
    console.log(CharArray)
    for (let i in CharArray) {
      CharArray[i].Percentage = (CharArray[i].times / groupMsglist.allcount * 100).toFixed(2)
    }
    issqtj = false
    console.log(bclist)
    let gameData = {
      tplFile: "./resources/list/list.html",
      pluResPath: `${this._path}/resources/`,
      name: "list",
      charlist: CharArray,
      dsw: CharArray[0],
      bqd: bclist[0],
      shwz: memberlist[0],
      type: "png",
      botcount: groupMsglist.botcount,
      allcount: groupMsglist.allcount,
      day: "今日"
    }
    let img = await puppeteer.screenshot("list", gameData)
    if (img) await this.reply(img)
  }

  /**
   * group 群id
   * startTime 开始时间
   * endTime 结束时间
   * Cfg.isMsgInfo 是否获取具体消息
   * Cfg.iscountBot 是否获取bot消息统计
   * Cfg.iscountAll 是否获取总消息统计
   * Cfg.iscountByDay 是否根据天数分割
   * @param startTime
   * @param endTime
   * @param Cfg
   * @param group_id
   */
  async getGroupHistoryMsg(startTime, endTime, Cfg = {}, group_id = this.e.group_id) {
    let isover
    let CharList = {}
    let data = {}
    let CharHistory = await this.Bot.pickGroup(group_id).getChatHistory(0, 1)
    let seq = CharHistory[0]?.seq || CharHistory[0]?.real_id
    if (!seq) return false
    let centerTime = endTime ? moment(endTime).unix() : moment().hour(0).minute(0).second(0).unix()
    if (Cfg.iscountBot) data.botcount = 0
    if (Cfg.iscountAll) data.allcount = 0
    startTime = startTime ? moment(startTime).unix() : moment().hour(0).minute(0).second(0).unix()
    endTime = endTime ? moment(endTime).unix() : moment().unix()
    if (moment(endTime * 1000) != moment().hour(0).minute(0).second(0)) centerTime = moment().hour(0).minute(0).second(0).unix()
    for (let i = seq; i > 0; i = i - 20) {
      let CharTemp = await this.Bot.pickGroup(group_id).getChatHistory(i, 20)
      CharTemp = lodash.orderBy(CharTemp, "time", "desc")
      if (i == seq && CharTemp.length == 0) return false
      if (CharTemp.length == 0) {
        if (Cfg.iscountByDay) {
          data[moment().format("YYYY-MM-DD")] = { ...data[moment().format("YYYY-MM-DD")], ...CharList }
        } else {
          data = { ...data, ...CharList }
        }
        break
      }
      for (const key in CharTemp) {
        let t = CharTemp[key].time * 1000
        if (Cfg.iscountByDay) {
          if (!data[moment(t).format("YYYY-MM-DD")] && CharTemp[key].time >= startTime) {
            data[moment(t).format("YYYY-MM-DD")] = {
              botcount: 0,
              allcount: 0
            }
          }
          if (CharTemp[key].time < centerTime) {
            centerTime = moment(t).hour(0).minute(0).second(0).unix()
            data[moment(t).add(1, "d").format("YYYY-MM-DD")] = { ...data[moment(t).add(1, "d").format("YYYY-MM-DD")], ...CharList }
            CharList = {}
          }
        }
        if (CharTemp[key].time < startTime) {
          isover = true
          break
        }
        if (CharTemp[key].time > endTime) continue
        if (CharTemp[key].user_id == this.Bot.uin) {
          if (Cfg.iscountBot) data.botcount++
          if (Cfg.iscountByDay) data[moment(t).format("YYYY-MM-DD")].botcount++
          continue
        }

        if (CharList[CharTemp[key].user_id]) {
          CharList[CharTemp[key].user_id].times += 1
          CharList[CharTemp[key].user_id].uname = CharTemp[key].sender.card ? CharTemp[key].sender.card : CharTemp[key].sender.nickname
          if (CharTemp[key].raw_message == "[动画表情]") CharList[CharTemp[key].user_id].facestime += 1
        } else {
          CharList[CharTemp[key].user_id] = {
            times: 1,
            user_id: CharTemp[key].user_id,
            facestime: 0,
            uname: CharTemp[key].sender.card ? CharTemp[key].sender.card : CharTemp[key].sender.nickname
          }
        }

        if (!CharList[CharTemp[key].user_id].msglist) CharList[CharTemp[key].user_id].msglist = []
        if (Cfg.isMsgInfo) CharList[CharTemp[key].user_id].msglist.push({ content: CharTemp[key]?.message, time: CharTemp[key].time })
        if (Cfg.iscountAll) data.allcount++
        if (Cfg.iscountByDay) data[moment(t).format("YYYY-MM-DD")].allcount++
      }
      if (isover) {
        data = Cfg.iscountByDay ? { ...data } : { ...CharList, ...data }
        break
      }
    }
    return { ...data }
  }
}
