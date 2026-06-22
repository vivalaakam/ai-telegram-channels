import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Op, Sequelize } from 'sequelize';

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare channelId: string;
    declare messageId: number;
    declare date: Date;
    declare editDate: Date | null;
    declare effectId: string | null;
    declare isPinned: boolean;
    declare senderId: Record<string, unknown> | null;
    declare replyTo: Record<string, unknown> | null;
    declare content: Record<string, unknown> | null;
    declare contentText: Record<string, unknown> | null;
    declare contentPhoto: Record<string, unknown> | null;
    declare contentVideo: Record<string, unknown> | null;
    declare contentVideoCover: Record<string, unknown> | null;
    declare contentVideoStoryboards: Record<string, unknown> | null;
    declare contentAlternativeVideos: Record<string, unknown> | null;
    declare contentAnimation: Record<string, unknown> | null;
    declare contentLinkPreviewOptions: Record<string, unknown> | null;
    declare contentLinkPreview: Record<string, unknown> | null;
    declare contentTextText: string | null;
    declare contentTextEntities: Record<string, unknown> | null;
    declare raw: Record<string, unknown>;
    declare isChecked: boolean | null;
    declare createdAt: CreationOptional<Date>;

    static async getUnchecked(): Promise<Message[]> {
        return Message.findAll({
            where: {
                contentTextText: { [Op.ne]: null },
                isChecked: { [Op.is]: null },
            },
            order: [['date', 'ASC']],
        });
    }

    async markChecked() {
        await this.update({ isChecked: true });
    }
}

export function initMessage(sequelize: Sequelize): typeof Message {
    Message.init(
        {
            channelId: {
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            messageId: {
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            editDate: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            effectId: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            isPinned: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            senderId: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            replyTo: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            content: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentText: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentPhoto: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentVideo: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentVideoCover: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentVideoStoryboards: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentAlternativeVideos: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentAnimation: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentLinkPreviewOptions: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentLinkPreview: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            contentTextText: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            contentTextEntities: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            raw: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            isChecked: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: null,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            tableName: 'messages',
            timestamps: false,
            underscored: true,
        },
    );

    // Prevent Sequelize from auto-adding an 'id' column — we use composite PK
    Message.removeAttribute('id');

    return Message;
}
