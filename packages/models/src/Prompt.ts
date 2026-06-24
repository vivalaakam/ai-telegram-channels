import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
    Op,
    Sequelize,
} from 'sequelize';
import { randomUUID } from 'node:crypto';

export class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
    declare id: CreationOptional<string>;
    declare content: string;
    declare version: CreationOptional<number>;
    declare tags: CreationOptional<string[]>;
    declare previousId: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;

    static async insertNew(content: string, tags: string[] = []): Promise<Prompt> {
        return Prompt.build({ id: randomUUID(), content, version: 1, tags, previousId: null }).save();
    }

    static async createVersion(previousId: string, content: string, tags: string[] = []): Promise<Prompt> {
        const prev = await Prompt.findByPk(previousId);
        const nextVer = (prev?.version ?? 0) + 1;
        return Prompt.build({ id: randomUUID(), content, version: nextVer, tags, previousId }).save();
    }

    static async findByTags(tags: string[]): Promise<Prompt[]> {
        return Prompt.findAll({
            where: { tags: { [Op.overlap]: tags } },
            order: [['createdAt', 'DESC']],
        });
    }

    static async getHistory(id: string): Promise<Prompt[]> {
        const chain: Prompt[] = [];
        let cur: Prompt | null = await Prompt.findByPk(id);
        while (cur) {
            chain.push(cur);
            cur = cur.previousId ? await Prompt.findByPk(cur.previousId) : null;
        }
        return chain;
    }
}

export function renderTemplate(content: string, vars: Record<string, string> = {}): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function initPrompt(sequelize: Sequelize): typeof Prompt {
    Prompt.init(
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: () => randomUUID() },
            content: { type: DataTypes.TEXT, allowNull: false },
            version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            tags: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
            previousId: { type: DataTypes.UUID, allowNull: true, defaultValue: null },
            createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { sequelize, tableName: 'prompts', underscored: true, updatedAt: false },
    );
    return Prompt;
}
