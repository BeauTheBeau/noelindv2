// Command to view possible moves a character can make
// based on their current rank

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    MOVES = require('../../data/moves.json');

module.exports = {
    data: new DISCORD.SlashCommandBuilder()
        .setName('moves')
        .setDescription('View unlocked moves for your character')
        .addStringOption(option => option
            .setName('character')
            .setDescription('The character to view moves for')
            .setRequired(false)),

    async execute(interaction) {

        const
            USER_ID = interaction.user.id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            CHARACTER = interaction.options.getString('character') || PROFILE.characters[PROFILE.characters.active]

        if (!PROFILE) return interaction.reply({
            content: 'You do not have a profile yet! Create one with /character create',
            ephemeral: true
        });

        if (!PROFILE.characters[CHARACTER]) return interaction.reply({
            content: 'You do not have that character!',
            ephemeral: true
        });

        // rank_1 {}
        // rank_2 {}
        //
        //

        const
            CHARACTER_MOVES = require(`../../data/moves.json`),
            CHARACTER_RANK = PROFILE.characters[CHARACTER].rank[1],
            CHARACTER_MOVES_OBJECT = CHARACTER_MOVES[`rank_${CHARACTER_RANK}`],
            SUCCESS_RATE = {
                "1": 'Low',
                "2": 'Medium',
                "3": 'High'
            },
            DAMAGE_LEVEL = {
                "1": 'Low',
                "2": 'Medium',
                "3": 'High',
                "4": 'Very High',
                "5": 'Extreme'
            };


        const
            EMBED = new DISCORD.EmbedBuilder()
                .setTitle(`${CHARACTER}'s Moves`)
                .setDescription(`Moves for ${CHARACTER} at **Rank ${CHARACTER_RANK}**`)

        for (const MOVE in CHARACTER_MOVES_OBJECT) {
            EMBED.addFields({
                name: CHARACTER_MOVES_OBJECT[MOVE].name,
                value: `- **DAMAGE:** ${DAMAGE_LEVEL[CHARACTER_MOVES_OBJECT[MOVE].damage_level]}\n- **SUCCESS RATE:** ${SUCCESS_RATE[CHARACTER_MOVES_OBJECT[MOVE].success_rate]}`,
                inline: true
            })
        }

        interaction.reply({embeds: [EMBED]});
    }
}