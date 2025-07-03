export default class base {
  constructor(e = {}) {
    this.e = e;
    this.userId = e?.user_id;
    this.model = "Fl-Plugin";
    this._path = process.cwd().replace(/\\/g, "/");
  }

  get prefix() {
    return `Yz:k-plugin:${this.model}:`;
  }

  /**
   * 截图默认数据
   * @param saveId html保存id
   * @param tplFile 模板html路径
   * @param pluResPath 插件资源路径
   */
  get screenData() {
    return {
      saveId: this.userId,
      tplFile: `./plugins/Fl-Plugin/resources/html/${this.model}/${this.model}.html`,
      /** 绝对路径 */
      pluResPath: `${this._path}/plugins/Fl-Plugin/resources/`,
    };
  }
}
