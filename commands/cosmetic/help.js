// Help command
// Loop through all the commands and generate a help message for each command

const
    DISCORD = require('discord.js'),
    fs = require('fs');


module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands'),

    async execute(interaction) {


        // get contents of help.md
        const HELP = fs.readFileSync('./data/help.md', 'utf8');


        const embed = new DISCORD.EmbedBuilder()
            .setTitle('Help')
            .setDescription(HELP)
            .setColor('#00ff00')
            .setTimestamp()

        await interaction.reply({embeds: [embed], ephemeral: true});
    }
}