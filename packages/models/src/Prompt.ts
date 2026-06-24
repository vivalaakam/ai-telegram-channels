import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
    QueryTypes,
    Sequelize,
} from 'sequelize';
import { randomUUID } from 'node:crypto';

export class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
    declare id: CreationOptional<string>;
    declare slug: string;
    declare content: string;
    declare version: CreationOptional<number>;
    declare isCurrent: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;

    static async getCurrent(slug: string): Promise<Prompt | null> {
        return Prompt.findOne({ where: { slug, isCurrent: true } });
    }

    static async insertNew(slug: string, content: string): Promise<Prompt> {
        return Prompt.build({ id: randomUUID(), slug, content, version: 1, isCurrent: true }).save();
    }

    static async nextVersion(slug: string, content: string): Promise<Prompt> {
        const rows = await Prompt.sequelize!.query<{ max: number }>(
            'SELECT COALESCE(MAX(version), 0) AS max FROM prompts WHERE slug = :slug',
            { replacements: { slug }, type: QueryTypes.SELECT },
        );
        const nextVer = (rows[0]?.max ?? 0) + 1;
        await Prompt.update({ isCurrent: false }, { where: { slug } });
        return Prompt.build({ id: randomUUID(), slug, content, version: nextVer, isCurrent: true }).save();
    }

    static async history(slug: string): Promise<Prompt[]> {
        return Prompt.findAll({ where: { slug }, order: [['version', 'DESC']] });
    }
}

export function renderTemplate(content: string, vars: Record<string, string> = {}): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function initPrompt(sequelize: Sequelize): typeof Prompt {
    Prompt.init(
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: () => randomUUID() },
            slug: { type: DataTypes.TEXT, allowNull: false },
            content: { type: DataTypes.TEXT, allowNull: false },
            version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { sequelize, tableName: 'prompts', underscored: true, updatedAt: false },
    );
    return Prompt;
}
