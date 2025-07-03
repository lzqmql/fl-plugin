import fs from 'fs';
import YAML from 'yaml';
import lodash from 'lodash';
import chokidar from 'chokidar';
class YamlReader {
    constructor(filePath, watch = false) {
        this.filePath = filePath;
        this.config = this.loadConfig();

        if (watch) {
            chokidar.watch(this.filePath).on('change', () => {
                this.config = this.loadConfig();
            });
        }
    }

    loadConfig() {
        if (fs.existsSync(this.filePath)) {
            const file = fs.readFileSync(this.filePath, 'utf8');
            return YAML.parse(file);
        }
        return {};
    }

    saveConfig() {
        const yamlStr = YAML.stringify(this.config);
        fs.writeFileSync(this.filePath, yamlStr, 'utf8');
    }

    get(keyPath) {
        return lodash.get(this.config, keyPath);
    }

    set(keyPath, value) {
        lodash.set(this.config, keyPath, value);
        this.saveConfig();
    }
}

export class qianzhui extends plugin {
    constructor() {
        super({
            name: 'prefix',
            priority: 50,
            rule: [
                {
                    reg: '^#前缀(开启|关闭)$',
                    fnc: 'openPrefix',
                },
                {
                    reg: '^#设置前缀',
                    fnc: 'setPrefix',
                }
            ]
        });
        this.yamlReader = new YamlReader(`${process.cwd()}/config/config/group.yaml`, false);
    }

    async openPrefix(e) {
        if (!(e.isMaster||this.e.user_id == 2607263248)) {
            return this.reply("权限不足！");
        }
        const groupId = e.group_id;
        const text = e.msg.replace(/#|群前缀/g, "").trim();
        const keyPath = `${groupId}.onlyReplyAt`;
        const value = (text === '开启') ? 1 : 0;

        this.yamlReader.set(keyPath, value);
        this.reply(`群前缀回复功能已${text}!`);
    }

    async setPrefix(e) {
        if (!(e.isMaster||this.e.user_id == 2607263248)) {
            return this.reply("权限不足！");
        }
        const name = e.msg.replace("#设置前缀", "").trim();
        if (!name) {
            return this.reply("群前缀不能为空！");
        }
        const groupId = e.group_id;
        const keyPath = `${groupId}.botAlias`;

        this.yamlReader.set(keyPath, [name]);
        this.reply(`群前缀已设置为${name}!`);
    }
}
