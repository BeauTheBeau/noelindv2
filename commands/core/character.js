// Character manager command

const
    DISCORD = require('discord.js'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    EAT_COOLDOWN = 60 * 15, // 1 hour
    EAT_COOLDOWN_LOGS = new DISCORD.Collection(),
    rank_thresholds = [200, 400, 800, 1100, 1400];

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

        let USER_ID = interaction.user.id;
        try {
            if (interaction.options.getUser('user').id !== undefined) USER_ID = interaction.options.getUser('user').id;
        } catch (error) {

        }


        const
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            SUBCOMMAND = interaction.options.getSubcommand(),
            NAME = interaction.options.getString('name');


        let
            CHARACTERS = PROFILE.characters;

        if (SUBCOMMAND === "create") {
            if (CHARACTERS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You already have a character with that name`,
                ephemeral: true
            });

            if (NAME.length > 20) return interaction.reply({
                content: `:negative_squared_cross_mark: Character names cannot be longer than 20 characters`,
                ephemeral: true
            });

            if (NAME.match(/[^a-zA-Z0-9]/g)) return interaction.reply({
                content: `:negative_squared_cross_mark: Character names can only contain alphanumeric characters`,
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

                await interaction.reply({
                    content: `:white_check_mark: Character created!`,
                    ephemeral: true
                });

            } catch (error) {
                console.log(error);
                await interaction.reply({
                    content: `:negative_squared_cross_mark:An error occurred while creating your character`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "delete") {

            if (!CHARACTERS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You don't have a character with that name`,
                ephemeral: true
            });

            // if active core
            if (CHARACTERS.active === NAME) return interaction.reply({
                content: `:negative_squared_cross_mark: You can't delete your active character`,
                ephemeral: true
            });

            try {
                delete CHARACTERS[NAME];
                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});
                await interaction.reply({
                    content: `:white_check_mark::white_check_mark: Character deleted!`,
                    ephemeral: true
                });
            } catch (error) {
                console.log(error);
                await interaction.reply({
                    content: `:negative_squared_cross_mark::ballot_box_with_check: An error occurred while deleting your character`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "select") {

            if (!CHARACTERS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You don't have a character with that name`,
                ephemeral: true
            });

            try {
                CHARACTERS.active = NAME;
                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});
            } catch (error) {
                console.log(error);
                return await interaction.reply({
                    content: `:negative_squared_cross_mark: An error occurred while selecting your character`,
                    ephemeral: true
                });
            }

        } else if (SUBCOMMAND === "list") {


            try {

                const
                    CHARACTER_LIST = Object.keys(CHARACTERS),
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`Character List`)
                        .setColor('#ff0000')
                        .setTimestamp()
                        .setDescription(`Active character: ${CHARACTERS.active}\n\n${CHARACTER_LIST.map((character, index) => `${index + 1}. ${character}`).join('\n')}`);

                await interaction.reply({
                    ephemeral: false,
                    embeds: [EMBED]
                });

            } catch (error) {

                console.log(error);
                return await interaction.reply({
                    content: `:negative_squared_cross_mark: An error occurred while getting your characters`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "info") {


            if (!CHARACTERS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You don't have a character with that name`,
                ephemeral: true
            });

            // Check if the character XP is enough to level up using rank_thresholds

            for (const [index, threshold] of rank_thresholds.entries()) {
                // Check if the character's rank is already that rank
                if (CHARACTERS[NAME].rank[1] === index + 1) continue;

                // Check if the character's CXP is greater than the threshold
                if (CHARACTERS[NAME].rank[0] >= threshold) {
                    CHARACTERS[NAME].rank[1] = index + 1;
                    await interaction.channel.send({
                        content: `Congratulations, ${NAME}! You have leveled up to rank ${index + 1}!`
                    });
                    await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});
                    break;
                }
            }

            try {
                function formatTimestamp(timestamp) {
                    if (timestamp) if (!isNaN(new Date(timestamp))) return "<t:" + Math.floor(timestamp / 1000) + ":R>";

                    return "Never";
                }

                const
                    CHARACTER = CHARACTERS[NAME],
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`Character Info`)
                        .setColor('#ff0000')
                        .setTimestamp()
                        .setDescription(
                            "## Basics\n" +
                            "Name: " + CHARACTER.name + "\n" +
                            "CXP: " + CHARACTER.rank[0] + " (Rank" + CHARACTER.rank[1] + ")\n" +
                            "Health: " + CHARACTER.health[0] + "/" + CHARACTER.health[1] + "\n\n" +
                            "## Stats\n" +
                            "Fights: " + CHARACTER.stats.fights + "\n" +
                            "Wins: " + CHARACTER.stats.wins + "\n" +
                            "Losses: " + CHARACTER.stats.losses + "\n" +
                            "Draws: " + CHARACTER.stats.draws + "\n" +
                            "Surrenders: " + CHARACTER.stats.surrender + "\n\n" +
                            "## Last...\n" +
                            "Ate: " + formatTimestamp(CHARACTER.last.ate) + "\n" +
                            "Fought: " + formatTimestamp(CHARACTER.last.fight) + "\n" +
                            "Won: " + formatTimestamp(CHARACTER.last.win) + "\n" +
                            "Lost: " + formatTimestamp(CHARACTER.last.loss) + "\n" +
                            "Draw: " + formatTimestamp(CHARACTER.last.draw) + "\n" +
                            "Surrendered: " + formatTimestamp(CHARACTER.last.surrender)
                        );

                await interaction.reply({
                    content: `:white_check_mark::white_check_mark: Character retrieved!`,
                    embeds: [EMBED]
                });

            } catch (error) {

                console.log(error);
                return await interaction.reply({
                    content: `:negative_squared_cross_mark: An error occurred while getting your character`,
                    ephemeral: true
                });
            }
        } else if (SUBCOMMAND === "eat") {

            if (!CHARACTERS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You don't have a character with that name`,
                ephemeral: true
            });
            if (EAT_COOLDOWN_LOGS[NAME]) return interaction.reply({
                content: `:negative_squared_cross_mark: You can't eat yet, you can eat again <t:${Math.floor(EAT_COOLDOWN_LOGS[NAME] / 1000) + EAT_COOLDOWN}:R>`,
                ephemeral: true
            });
            if (CHARACTERS[NAME].health[0] === 0) return interaction.reply({
                content: `:negative_squared_cross_mark: You are dead`,
                ephemeral: true
            });

            try {
                // Add a random amount of health (max 20)
                const
                    HEALTH = CHARACTERS[NAME].health[0] + Math.floor(Math.random() * 20) + 1,
                    EMBED = new DISCORD.EmbedBuilder()
                        .setTitle(`You ate food`)
                        .setColor('#ff0000')
                        .setTimestamp()

                if (CHARACTERS[NAME].health[0] < 60) {
                    EMBED.setDescription(`You ate food, but your health is too low to gain any health! You must visit a Lekar`);
                } else if (CHARACTERS[NAME].health[0] <= 100) {
                    EMBED.setDescription(`You ate some food, but you are already at full health!`);
                    CHARACTERS[NAME].health[0] = HEALTH;
                } else {
                    EMBED.setDescription(`You ate some food and gained ${HEALTH - CHARACTERS[NAME].health[0]} health!`);
                    CHARACTERS[NAME].health[0] = HEALTH;
                    if (CHARACTERS[NAME].health[0] > CHARACTERS[NAME].health[1]) CHARACTERS[NAME].health[0] = CHARACTERS[NAME].health[1];
                }

                CHARACTERS[NAME].last.ate = Date.now();
                EAT_COOLDOWN_LOGS[NAME] = Date.now();
                await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID}, {characters: CHARACTERS});

                await interaction.reply({
                    content: `:white_check_mark: You ate!`,
                    embeds: [EMBED]
                });

            } catch (error) {
                console.log(error);
                return await interaction.reply({
                    content: `:negative_squared_cross_mark: An error occurred while eating`,
                    ephemeral: true
                });
            }
        }
    }
}