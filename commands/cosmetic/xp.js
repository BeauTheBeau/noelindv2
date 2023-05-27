// XP viewer command

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('xp')
        .setDescription('View the XP and level of a user')

        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View the XP and level of a user')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User to view XP of')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('leaderboard')
            .setDescription('View the XP leaderboard')
        ),


    async execute(interaction) {

        const
            USER = interaction.options.getUser('user') || interaction.user,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER.id}),
            SUBCOMMAND = interaction.options.getSubcommand();

        if (SUBCOMMAND === 'leaderboard') {

            // List top 10 users
            const
                TOP_USERS = await PROFILE_MODEL.find({}).sort({xp: -1}).limit(10),
                EMBED = new DISCORD.EmbedBuilder()
                    .setTitle('XP Leaderboard')
                    .setDescription(`${TOP_USERS.map((user, position) => {
                        return `${position + 1}. <@${USER.id}> - Level ${user.level} (${user.xp} XP)`
                    }).join('\n')}`)
                    .setTimestamp();

            return interaction.reply({
                embeds: [EMBED],
                ephemeral: true
            });
        }

        else {

            return interaction.reply({
                content: `${USER.tag} is level ${PROFILE.level} with ${PROFILE.xp} XP`,
                ephemeral: true
            });
        }
    }
}