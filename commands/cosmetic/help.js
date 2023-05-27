// Help command
// Loop through all the commands and generate a help message for each command

const
    DISCORD = require('discord.js'),
    FS = require('fs'),
    PATH = require('path');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands'),

    async execute(interaction) {

        // Get all the commands
        const
            COMMANDS = [],
            COMMAND_FILES = FS.readdirSync(PATH.resolve(__dirname, '..')).filter(file => file.endsWith('.js'));

        for (const FILE of COMMAND_FILES) {
            const COMMAND = require(PATH.resolve(__dirname, '..', FILE));
            COMMANDS.push(COMMAND.data.toJSON());
        }

        // Generate the help message, include fields for each command
        // optional fields wrapped in <> brackets
        // required fields wrapped in [] brackets

        const HELP_MESSAGE = `**Commands**\n${COMMANDS.map(command => {
            `**/${command.name}** - ${command.description}\n${command.options.map(option => {
                if (option.type === 'SUB_COMMAND') {
                    return `**/${command.name} ${option.name}** - ${option.description}\n${option.options.map(option => {
                        return `**/${command.name} ${option.name}** - ${option.description}`
                    }).join('\n')}`
                } else {
                    return `**/${command.name} ${option.name}** - ${option.description}`
                }
            }).join('\n')}`
        }).join('\n')}`;

        return interaction.reply({
            content: HELP_MESSAGE,
            ephemeral: true
        });
    }
}