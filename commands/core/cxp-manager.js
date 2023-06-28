// CXP manager command

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    CONFIG = require('../../backend/config.json'),
    FS = require('fs');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('cxp-manager')
        .setDescription(`Manage character\'s Combat XP`)

        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add CXP to a character')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User who owns the character')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('character')
                .setDescription('Character to add CXP to')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('Amount of CXP to add')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove CXP from a character')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User who owns the character')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('character')
                .setDescription('Character to remove CXP from')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('Amount of CXP to remove')
                .setRequired(true)
            )),

    async execute(interaction) {

        // Authenticate the user
        if (interaction.guildId !== '1026085612891164732') {
            if (!interaction.member.roles.cache.has('894631600967540838')) return interaction.reply({
                content: 'You do not have permission to use this command',
                ephemeral: true
            });
        }

        const
            SUBCOMMAND = interaction.options.getSubcommand(),
            USER = interaction.options.getUser('user') || interaction.user,
            CHARACTER = interaction.options.getString('character') || null,
            AMOUNT = interaction.options.getInteger('amount') || 0;

        if (SUBCOMMAND === 'add') {

            if (AMOUNT < 1) return interaction.reply({content: `You can't add less than 1 CXP!`, ephemeral: true});

            try {
                let PROFILE = await PROFILE_MODEL.findOne({userID: USER.id});

                if (!PROFILE) {
                    PROFILE = await PROFILE_MODEL.create({
                        userID: USER.id,
                        characters: []
                    });
                }

                let character = PROFILE.characters.find(character => character.name === CHARACTER);
                if (!character) return interaction.reply({
                    content: `That character doesn't exist!`,
                    ephemeral: true
                });

                character.cxp += AMOUNT;
                PROFILE.markModified('characters');
                await PROFILE.save();

                return interaction.reply({content: `Added ${AMOUNT} CXP to ${CHARACTER}!`});
            } catch(error) {
                console.error(error);
                return interaction.reply({content: `An error occurred during the operation.`, ephemeral: true});
            }
        }


        if (SUBCOMMAND === 'remove') {
            if (AMOUNT < 1) return interaction.reply({content: `You can't remove less than 1 CXP!`, ephemeral: true});

            try {
                let PROFILE = await PROFILE_MODEL.findOne({userID: USER.id});
                if (!PROFILE) PROFILE = await PROFILE_MODEL.create({userID: USER.id, characters: []});


                const character = PROFILE.characters.find(character => character.name === CHARACTER);
                if (!character) return interaction.reply({content: `That character doesn't exist!`, ephemeral: true});

                if (character.cxp < AMOUNT) return interaction.reply({
                    content: `${CHARACTER} doesn't have enough CXP!`,
                    ephemeral: true
                });

                character.cxp -= AMOUNT;
                PROFILE.markModified('characters');
                await PROFILE.save();

                return interaction.reply({content: `Removed ${AMOUNT} CXP from ${CHARACTER}!`});
            } catch (error) {
                console.error(error);
                return interaction.reply({content: `An error occurred while removing CXP!`, ephemeral: true});
            }
        }
    }
}

