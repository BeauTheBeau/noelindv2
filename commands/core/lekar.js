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
            ))
        .addSubcommand(subcommand => subcommand
            .setName('heal')
            .setDescription('Heal a character')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User who owns the character')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('character')
                .setDescription('Name of the character to heal')
                .setRequired(true)
            )),

    async execute(interaction) {

        const
            USER_ID = interaction.options.getUser('user') ? interaction.options.getUser('user').id : interaction.user.id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID});

        console.log(USER_ID);

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

                if (!PROFILE.characters[CHARACTER]) return interaction.reply({
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
                // Loop through an array and check the dictionaries

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

                // Check if all of the Lekars still exist
                // Loop through users and their characters
                // and check if the character exists

                for (let i = 0; i < lekars.length; i++) {

                    try {
                        const
                            USER_ID = lekars[i].split(' | ')[0].replace('<@', '').replace('>', ''),
                            CHARACTER = lekars[i].split(' | ')[1];

                        if (!PROFILE_MODEL.findOne({userID: USER_ID}).characters[CHARACTER]) lekars.splice(i, 1);
                    }
                    catch (e) {}

                }

                return interaction.reply({
                    content: lekars.join('\n'),
                    ephemeral: true
                });
            case 'heal':

                // Check if the user's active character is a Lekar
                // Loop through array and check the dictionaries

                const
                    healer_profile = await PROFILE_MODEL.findOne({userID: interaction.user.id}),
                    target_profile = await PROFILE_MODEL.findOne({userID: USER_ID});

                // Loop through the lekar array and check if the user's active character is a lekar
                // Dont check if target is in the array

                // Array looks like this:
                // "lekars": [
                // {
                //     "name": "Arkane",
                //     "user": "501423235854893066"
                // },
                // {
                //     "name": "Beau2",
                //     "user": "729567972070391848"
                // }
                // ]

                let isLekar = false;
                for (let i = 0; i < LEKARS.length; i++) {
                    if (LEKARS[i].user === interaction.user.id) {
                        if (healer_profile.characters.active === LEKARS[i].name) {
                            isLekar = true;
                            break;
                        }
                    }
                }

                if (!isLekar) return interaction.reply({
                    content: 'Your active character is not a Lekar!',
                    ephemeral: true
                });

                // Heal the target

                if (!target_profile.characters[CHARACTER]) return interaction.reply({
                    content: 'This character does not exist!',
                    ephemeral: true
                });

                if (target_profile.characters[CHARACTER].health === 100) return interaction.reply({
                    content: 'This character is already at full health!',
                    ephemeral: true
                });

                // Heal tham a random amount between 1 and 25
                let oldHealth = target_profile.characters[CHARACTER].health[0];
                target_profile.characters[CHARACTER].health[0] += Math.floor(Math.random() * 25) + 1;
                if (target_profile.characters[CHARACTER].health[0] > 100) {
                    target_profile.characters[CHARACTER].health[0] = 100;
                }

                target_profile.markModified('characters');
                target_profile.save();

                return interaction.reply({
                    content: `${healer_profile.characters.active} healed ${CHARACTER}, their health went from ${oldHealth} to ${target_profile.characters[CHARACTER].health[0]}!`,
                    ephemeral: false
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
