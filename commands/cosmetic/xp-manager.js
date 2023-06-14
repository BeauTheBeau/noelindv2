// XP manager command

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    CONFIG = require('../../backend/config.json'),
    FS = require('fs');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('xp-manager')
        .setDescription('Manage user\'s XP')
        .setDefaultMemberPermissions(DISCORD.PermissionFlagsBits.ManageMembers)
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add XP to a user')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User to add XP to')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('Amount of XP to add')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove XP from a user')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User to remove XP from')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('Amount of XP to remove')
                .setRequired(true)
            ))
        .addSubcommandGroup(subcommandGroup => subcommandGroup
            .setName(`blacklist`)
            .setDescription(`Enable or disable XP gain in specific channels`)
            .addSubcommand(subcommand => subcommand
                .setName('enable')
                .setDescription('Enable XP gain in a channel')
                .addChannelOption(option => option
                    .setName('channel')
                    .setDescription('Channel to enable XP gain in')
                    .setRequired(false)
                ))
            .addSubcommand(subcommand => subcommand
                .setName('disable')
                .setDescription('Disable XP gain in a channel')
                .addChannelOption(option => option
                    .setName('channel')
                    .setDescription('Channel to disable XP gain in')
                    .setRequired(false)
                ))
            .addSubcommand(subcommand => subcommand
                .setName('list')
                .setDescription('List channels where XP gain is disabled'))
        ),

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
            CHANNEL = interaction.options.getChannel('channel') || interaction.channel,
            USER = interaction.options.getUser('user') || interaction.user,
            AMOUNT = interaction.options.getInteger('amount') || 0;

        let
            PROFILE = await PROFILE_MODEL.findOne({userID: USER.id});

        if (SUBCOMMAND === 'add') {

            PROFILE.xp += AMOUNT;
            PROFILE.save();

            return interaction.reply({content: `Added ${AMOUNT} XP to ${USER.tag}`, ephemeral: true});
        }
        else if (SUBCOMMAND === 'remove') {

            PROFILE.xp -= AMOUNT;
            PROFILE.save();

            return interaction.reply({content: `Removed ${AMOUNT} XP from ${USER.tag}`, ephemeral: true});
        }
        else if (SUBCOMMAND === 'enable') {

            // save to config.json
            CONFIG.xp_blacklist.splice(CONFIG.xp_blacklist.indexOf(CHANNEL.id), 1);
            FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({content: `Enabled XP gain in <#${CHANNEL.id}>`, ephemeral: true});
        }
        else if (SUBCOMMAND === 'disable') {

            // save to config.json file using FS
            CONFIG.xp_blacklist.push(CHANNEL.id);
            FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({content: `Disabled XP gain in <#${CHANNEL.id}>`, ephemeral: true});
        }
        else if (SUBCOMMAND === 'list') {
            return interaction.reply({
                content: `XP gain is disabled in: ${CONFIG.xp_blacklist.map(channel => `<#${channel}>`).join(', ')}`,
                ephemeral: true
            });
        }
    }
}