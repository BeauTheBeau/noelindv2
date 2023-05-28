// Character manager command

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('character')
        .setDescription('Manage your characters')

        .addSubcommand(subcommand => subcommand
            .setName('create')
            .setDescription('Create a new character')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the character')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('delete')
            .setDescription('Delete a character')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the character')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('select')
            .setDescription('Select a character to be your primary character')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the character')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List your characters')
            .addUserOption(option => option
                .setName('user')
                .setDescription('User to list characters of')
                .setRequired(false)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('info')
            .setDescription('Get info about a character')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the character')
                .setRequired(true)
            )
            .addUserOption(option => option
                .setName('user')
                .setDescription(`The user who owns the character; defaults to you`)
                .setRequired(false)
            ))
        .addSubcommand(subcommand => subcommand.setName(`eat`)
            .setDescription(`Eat food to restore health`)
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the character; defaults to your active character')
                .setRequired(false)
            )),

    async execute(interaction) {

        const
            USER_ID = interaction.user.id || interaction.options.getUser('user').id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            SUBCOMMAND = interaction.options.getSubcommand(),
            NAME = interaction.options.getString('name');

        let
            CHARACTERS = PROFILE.characters;


        if (SUBCOMMAND === "create") {

            // Conduct prechecks
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Conducting prechecks...`,
                ephemeral: true
            });

            if (CHARACTERS[NAME]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You already have a character with that name`,
                ephemeral: true
            });

            if (NAME.length > 20) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: Character names cannot be longer than 20 characters`,
                ephemeral: true
            });

            if (NAME.match(/[^a-zA-Z0-9]/g)) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: Character names can only contain alphanumeric characters`,
                ephemeral: true
            });


            // Create the character
            await interaction.editReply({
                content: `:white_check_mark::hammer: Prechecks complete, creating character...`,
                ephemeral: true
            });

            try {

                CHARACTERS[NAME] = {
                    name: NAME,
                    rank: [0, 1], // xp, rank
                    isLekar: false,
                    health: [100, 100], // current, max
                    stats: {
                        fights: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        surrender: 0
                    },
                    last: {
                        ate: null,
                        fight: null,
                        win: null,
                        loss: null,
                        draw: null,
                        surrender: null
                    }
                }

                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});

                await interaction.editReply({
                    content: `:white_check_mark::white_check_mark: Character created!`,
                    ephemeral: true
                });

            } catch (error) {
                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while creating your character`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "delete") {

            // Conduct prechecks
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Conducting prechecks...`,
                ephemeral: true
            });

            if (!CHARACTERS[NAME]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You don't have a character with that name`,
                ephemeral: true
            });

            // if active core
            if (CHARACTERS.active === NAME) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You can't delete your active character`,
                ephemeral: true
            });

            // Delete the character
            await interaction.editReply({
                content: `:white_check_mark::hammer: Prechecks complete, deleting character...`,
            });

            try {

                delete CHARACTERS[NAME];

                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});

                await interaction.editReply({
                    content: `:white_check_mark::white_check_mark: Character deleted!`,
                    ephemeral: true
                });
            } catch (error) {
                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while deleting your character`,
                    ephemeral: true
                });
            }

        } else if (SUBCOMMAND === "select") {

            // Conduct prechecks
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Conducting prechecks...`,
                ephemeral: true
            });

            if (!CHARACTERS[NAME]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You don't have a character with that name`,
                ephemeral: true
            });

            // Select the character
            await interaction.editReply({
                content: `:white_check_mark::hammer: Prechecks complete, selecting character...`,
            });

            try {

                CHARACTERS.active = NAME;
                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});

                await interaction.editReply({
                    content: `:white_check_mark::white_check_mark: Character selected!`,
                    ephemeral: true
                });
            } catch (error) {
                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while selecting your character`,
                    ephemeral: true
                });
            }

        } else if (SUBCOMMAND === "list") {

            // Get characters
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Getting characters...`,
                ephemeral: true
            });

            try {

                const
                    CHARACTER_LIST = Object.keys(CHARACTERS),
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`Character List`)
                        .setColor('#ff0000')
                        .setTimestamp()
                        .setDescription(`Active character: ${CHARACTERS.active}\n\n${CHARACTER_LIST.map((character, index) => `${index + 1}. ${character}`).join('\n')}`);

                await interaction.editReply({
                    content: `:white_check_mark::white_check_mark: Characters retrieved!`,
                    ephemeral: true,
                    embeds: [EMBED]
                });

            } catch (error) {

                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while getting your characters`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "info") {

            // Conduct prechecks
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Conducting prechecks...`,
                ephemeral: true
            });

            if (!CHARACTERS[NAME]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You don't have a character with that name`,
                ephemeral: true
            });

            // Get the character
            await interaction.editReply({
                content: `:white_check_mark::hammer: Prechecks complete, getting character...`,
            });

            try {

                const
                    CHARACTER = CHARACTERS[NAME],
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`Character Info`)
                        .setColor('#ff0000')
                        .setTimestamp()
                        .setDescription(`## Basics\nName: ${CHARACTER.name}\nRank: ${CHARACTER.rank[1]}\nHealth: ${CHARACTER.health[0]}/${CHARACTER.health[1]}\n\n## Stats\nFights: ${CHARACTER.stats.fights}\nWins: ${CHARACTER.stats.wins}\nLosses: ${CHARACTER.stats.losses}\nDraws: ${CHARACTER.stats.draws}\nSurrenders: ${CHARACTER.stats.surrender}`);

                await interaction.editReply({
                    content: `:white_check_mark::white_check_mark: Character retrieved!`,
                    ephemeral: true,
                    embeds: [EMBED]
                });

            } catch (error) {

                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while getting your character`,
                    ephemeral: true
                });

            }
        } else if (SUBCOMMAND === "eat") {

            // Conduct prechecks
            await interaction.reply({
                content: `:mag::ballot_box_with_check:  Conducting prechecks...`,
                ephemeral: true
            });

            if (!CHARACTERS[NAME]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You don't have a character with that name`,
                ephemeral: true
            });


            if (CHARACTERS[NAME].health[0] === CHARACTERS[NAME].health[1]) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: Your health is already full`,
                ephemeral: true
            });

            if (CHARACTERS[NAME].health[0] === 0) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: You are dead`,
                ephemeral: true
            });

            // If health is below 40
            if (CHARACTERS[NAME].health[0] < 40) return interaction.editReply({
                content: `:negative_squared_cross_mark::ballot_box_with_check: Health is too low to eat, visit a Llama to heal instead`,
                ephemeral: true
            });

            // Eat
            await interaction.editReply({
                content: `:white_check_mark::hammer: Prechecks complete, eating...`,
            });

            try {
                // Add a random amount of health (max 20)
                const
                    HEALTH = CHARACTERS[NAME].health[0] + Math.floor(Math.random() * 20) + 1,
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`Ate food`)
                        .setColor('#ff0000')
                        .setTimestamp()
                        .setDescription(`You ate some food and gained ${HEALTH - CHARACTERS[NAME].health[0]} health!`);

                CHARACTERS[NAME].health[0] = HEALTH;
                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});
            } catch (error) {
                console.log(error);
                await interaction.editReply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while eating`,
                    ephemeral: true
                });
            }
        }
    }
}