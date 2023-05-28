// <> = required; [] = optional

// Lekar command
// - Add lekar <user> <character>        | Add a Lekar
// - Remove lekar <user> <character>     | Remove a Lekar
// - List lekars [user]                  | List all Lekars or Lekars of a user

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    CONFIG = require('../../backend/config.json'),
    LEKARS = CONFIG.lekars,
    fs = require('fs');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('lekar')
        .setDescription('Manage Lekars')

        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a Lekar')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User who owns the character')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('character')
                .setDescription('Name of the character')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a Lekar')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User who owns the character')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('character')
                .setDescription('Name of the character')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List all Lekars or Lekars of a user')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User to list Lekars of')
                .setRequired(false)
            )),

    async execute(interaction) {

        const
            USER_ID = /* check if user option is set */ interaction.options.getUser('user') ? interaction.options.getUser('user').id : interaction.user.id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID});

        console.log(PROFILE)

        const
            SUBCOMMAND = interaction.options.getSubcommand(),
            USER = interaction.options.getUser('user'),
            CHARACTER = interaction.options.getString('character');

        switch (SUBCOMMAND) {
            case 'add':

                // Check if the character is already a Lekar
                // Loop through array and check the dictionaries
                // for the character name

                for (let i = 0; i < LEKARS.length; i++) {
                    if (LEKARS[i].name === CHARACTER) {
                        return interaction.reply({content: 'This character is already a Lekar!', ephemeral: true});
                    }
                }

                let characterExists = false;
                if (PROFILE.characters[CHARACTER]) characterExists = true;

                if (!characterExists) return interaction.reply({
                    content: 'This character does not exist!',
                    ephemeral: true
                });

                // Set isLekar to true and add the char to the array
                PROFILE.characters[CHARACTER].isLekar = true;
                CONFIG.lekars.push({name: CHARACTER, user: USER_ID});

                // save config json
                fs.writeFile('./backend/config.json', JSON.stringify(CONFIG), (err) => {
                    if (err) throw err;
                    console.log('The file has been saved!');
                });

                // Save the profile and reply
                PROFILE.save();

                return interaction.reply({
                    content: `Added <@${USER_ID}>'s character ${CHARACTER} as a Lekars!`,
                    ephemeral: true
                });

            case 'remove':

                // Check if the character is a Lekar
                // Loop through array and check the dictionaries

                for (let i = 0; i < LEKARS.length; i++) {
                    if (LEKARS[i].name === CHARACTER) {
                        CONFIG.lekars.splice(i, 1);
                        PROFILE.characters[CHARACTER].isLekar = false;
                        PROFILE.save();
                        fs.writeFile('./backend/config.json', JSON.stringify(CONFIG), (err) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        return interaction.reply({
                            content: `Removed <@${USER_ID}>'s character ${CHARACTER} as a Lekars!`,
                            ephemeral: true
                        });
                    }
                }

                return interaction.reply({
                    content: 'This character is not a Lekar!',
                    ephemeral: true
                });

            case 'list':

                // Check if the user is a Lekar
                // Loop through array and check the dictionaries

                let lekars = [];

                if (USER) {
                    for (let i = 0; i < LEKARS.length; i++) {
                        if (LEKARS[i].user === USER_ID) {
                            lekars.push(LEKARS[i].name);
                        }
                    }
                } else {
                    for (let i = 0; i < LEKARS.length; i++) {
                        lekars.push(`<@${LEKARS[i].user}> | ${LEKARS[i].name}`);
                    }
                }

                if (lekars.length === 0) return interaction.reply({
                    content: 'This user has no Lekars!',
                    ephemeral: true
                });

                return interaction.reply({
                    content: lekars.join('\n'),
                    ephemeral: true
                });

            default: {
                return interaction.reply({
                    content: 'Something went wrong!',
                    ephemeral: true
                });
            }


        }
    }
}
