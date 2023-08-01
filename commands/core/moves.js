// Command to view possible moves a character can make
// based on their current rank

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    MOVES_MODEL = require('../../schemas/move.js');

module.exports = {
    data: new DISCORD.SlashCommandBuilder()
        .setName('moves')
        .setDescription('Manage moves and view possible moves for a character')
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View possible moves for a character')
            .addStringOption(option => option
                .setName('character')
                .setDescription('The character to view moves for')
                .setRequired(false))
        )
        .addSubcommand(subcommand => subcommand
            .setName(`create`)
            .setDescription('Create a new move')
            .addStringOption(option => option
                .setName('name')
                .setDescription('The name of the move')
                .setRequired(true))
            .addStringOption(option => option
                .setName('description')
                .setDescription('The description of the move')
                .setRequired(true))
            .addStringOption(option => option
                .setName('damage_level')
                .setDescription('The damage level of the move')
                .setRequired(true)
                .addChoices(
                    {name: 'Level 1', value: '1'},
                    {name: 'Level 2', value: '2'},
                    {name: 'Level 3', value: '3'},
                    {name: 'Level 4', value: '4'},
                    {name: 'Level 5', value: '5'}
                ))
            .addStringOption(option => option
                .setName('success_rate')
                .setDescription('The success rate of the move')
                .setRequired(true)
                .addChoices(
                    {name: 'Low (25%)', value: '0.25'},
                    {name: 'Medium (50%)', value: '0.5'},
                    {name: 'High (75%)', value: '0.75'},
                    {name: 'Very High (90%)', value: '0.9'}
                ))
            .addStringOption(option => option
                .setName('rank')
                .setDescription('The rank to add the move to')
                .setRequired(true)
                .addChoices(
                    {name: 'Rank 1', value: '1'},
                    {name: 'Rank 2', value: '2'},
                    {name: 'Rank 3', value: '3'},
                    {name: 'Rank 4', value: '4'},
                    {name: 'Rank 5', value: '5'}
                )))
        .addSubcommand(subcommand => subcommand
            .setName('delete')
            .setDescription('Delete a move')
            .addStringOption(option => option
                .setName('name')
                .setDescription('The name of the move to delete')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List all moves')),


    async execute(interaction) {

        const
            USER_ID = interaction.user.id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            CHARACTER = interaction.options.getString('character') || PROFILE.characters[PROFILE.characters.active],
            SUBCOMMAND = interaction.options.getSubcommand();

        if (SUBCOMMAND === 'view') {
            if (!PROFILE) return interaction.reply({
                content: 'You do not have a profile yet! Create one with /character create',
                ephemeral: true
            });

            if (!PROFILE.characters[CHARACTER]) return interaction.reply({
                content: 'You do not have that character!',
                ephemeral: true
            });

            const
                CHARACTER_RANK = PROFILE.characters[CHARACTER].rank[1],
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

            // If there are ranks below the current rank, add them to the object
            // Use the movesModel
            const CHARACTER_MOVES_OBJECT = {};

            for (let i = 1; i <= CHARACTER_RANK; i++) {
                const MOVES = await MOVES_MODEL.find({rank: i});
                MOVES.forEach(move => {
                    CHARACTER_MOVES_OBJECT[move.name] = move;
                });
            }

            const
                EMBED = new DISCORD.EmbedBuilder()
                    .setTitle(`${CHARACTER}'s Moves`)
                    .setDescription(`Moves for ${CHARACTER} at **Rank ${CHARACTER_RANK}**`)

            // Add moves to the embed DESCRIPTION
            // With a heading for each rank
            let description = '';
            let lastRank = 0;

            for (const MOVE in CHARACTER_MOVES_OBJECT) {

                if (lastRank !== CHARACTER_MOVES_OBJECT[MOVE].rank) {
                    description += `\n# Rank ${CHARACTER_MOVES_OBJECT[MOVE].rank}\n`;
                    lastRank = CHARACTER_MOVES_OBJECT[MOVE].rank;
                }

                description += `## ${MOVE}\n`;
                if (CHARACTER_MOVES_OBJECT[MOVE].description) description += `**Description:** ${CHARACTER_MOVES_OBJECT[MOVE].description}\n`;
                description += `**Damage Level:** ${DAMAGE_LEVEL[CHARACTER_MOVES_OBJECT[MOVE].damage_level]}\n`;
                description += `**Success Rate:** ${MOVE.success_rate}\n`;

            }

            EMBED.setDescription(`${CHARACTER_MOVES_OBJECT.length === 0 ? 'There are no moves for this character yet!' : 
                `${description}`}`);

            interaction.reply({embeds: [EMBED], ephemeral: true});
        }
        if (SUBCOMMAND === 'list') {
            const
                MOVES = await MOVES_MODEL.find(),
                EMBED = new DISCORD.EmbedBuilder()
                    .setTitle('Moves')
                    .setDescription('All moves');

            if (MOVES.length === 0) return interaction.reply({
                content: 'There are no moves yet!',
                ephemeral: true
            });

            // Add moves to the embed DESCRIPTION
            // With a heading for each rank
            let description = '';
            let lastRank = 0;

            for (const MOVE of MOVES) {

                if (lastRank !== MOVE.rank) {
                    description += `\n# Rank ${MOVE.rank}\n`;
                    lastRank = MOVE.rank;
                }

                description += `## ${MOVE.name}\n`;
                if (MOVE.description) description += `**Description:** ${MOVE.description}\n`;
                description += `**Damage Level:** ${MOVE.damage_level}\n`;
                description += `**Success Rate:** ${MOVE.success_rate}\n\n`;
            }

            EMBED.setDescription(description);

            interaction.reply({embeds: [EMBED], ephemeral: true});
        }



        // ADMIN COMMANDS
        if (SUBCOMMAND === 'create') {

            const
                NAME = interaction.options.getString('name'),
                DESCRIPTION = interaction.options.getString('description'),
                DAMAGE_LEVEL = interaction.options.getString('damage_level'),
                SUCCESS_RATE = interaction.options.getString('success_rate'),
                RANK = interaction.options.getString('rank');

            if (!NAME || !DESCRIPTION || !DAMAGE_LEVEL || !SUCCESS_RATE || !RANK) return interaction.reply({
                content: 'You are missing a required argument!',
                ephemeral: true
            });

            const
                MOVE = new MOVES_MODEL({
                    name: NAME,
                    description: DESCRIPTION,
                    damage_level: DAMAGE_LEVEL,
                    success_rate: SUCCESS_RATE,
                    rank: RANK
                });

            MOVE.save().then(() => {
                interaction.reply({
                    content: `Successfully created move **${NAME}**!`,
                    ephemeral: true
                });
            }).catch((err) => {
                console.log(err);
                interaction.reply({
                    content: 'An error occurred while creating the move!',
                    ephemeral: true
                });
            });

        }
        if (SUBCOMMAND === 'delete') {

                const NAME = interaction.options.getString('name');

                if (!NAME) return interaction.reply({
                    content: 'You are missing a required argument!',
                    ephemeral: true
                });

                MOVES_MODEL.findOneAndDelete({name: NAME}).then(() => {
                    interaction.reply({
                        content: `Successfully deleted move **${NAME}**!`,
                        ephemeral: true
                    });
                }).catch((err) => {
                    console.log(err);
                    interaction.reply({
                        content: 'An error occurred while deleting the move!',
                        ephemeral: true
                    });
                });
        }

    }
}