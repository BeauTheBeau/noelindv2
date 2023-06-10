// Help command
// Loop through all the commands and generate a help message for each command

const
    DISCORD = require('discord.js'),
    fs = require('fs');


module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands')
        .addStringOption(option => option
            .setName('category')
            .setDescription('Category to view commands of')
            .setRequired(false)
            .addChoices(
                {name: 'XP', value: 'xp'}, // done
                {name: 'XP Manager', value: 'xpmanager'}, // done
                {name: 'Character', value: 'character'}, // done
                {name: `Fight`, value: 'fight'}, // done
                {name: `Lekar`, value: 'lekar'}, // done
                {name: `Moves`, value: 'moves'}, // done
                {name: `Shop`, value: 'shop'}, // done
                {name: `Shop Manager`, value: 'shopmanager'}, // done
                {name: `General Information`, value: 'general'}, // done
                {name: `Legacy`, value: 'old'}, // done
            )
        ),

    async execute(interaction) {

        let help, category = interaction.options.getString('category')

        try {
            if (category === null) category = "general"
            help = fs.readFileSync(`./data/help/${category}.md`, `utf8`);
        } catch (error) {
            help = `Could not find help file (\`./data/help/${category}.md\`)`;
        }

        const embed = new DISCORD.EmbedBuilder()
            .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(help)
            .setColor('#00ff00')
            .setTimestamp()

        await interaction.reply({embeds: [embed], ephemeral: true});
    }
}