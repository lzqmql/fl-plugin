import { update } from "../../other/update.js"
export class tkupdate extends plugin {
  constructor() {
    super({
      name: "[风铃插件]更新",
      event: "message",
      priority: 1145,
      rule: [
        {
          reg: "^#*风铃(插件)?(强制)?更新$",
          fnc: "update"
        }
      ]
    })
  }
  async update(e = this.e) {
    e.msg = `#${e.msg.includes("强制")?"强制":""}更新Fl-Plugin`
    const up = new update(e)
    up.e = e
    return up.update()
  }
}