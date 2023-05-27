// Fight command

const
    DISCORD = require('discord.js'),
    MONGOOSE = require('mongoose'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    FIGHT_MODEL = require('../../schemas/fight.js'),
    MOVES = require('../../data/moves.json');


module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('fight')
        .setDescription('Fight another player')
        .addUserOption(option => option
            .setName('user')
            .setDescription('User to fight')
            .setRequired(true)
        )

        .addStringOption(option => option
            .setName('character')
            .setDescription('Character to fight with')
            .setRequired(true)
        ),

    async execute(interaction) {

        const
            USER_ID = interaction.user.id,
            OPPONENT_ID = interaction.options.getUser('user').id,
            CHARACTER = interaction.options.getString('character'),
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            OPPONENT_PROFILE = await PROFILE_MODEL.findOne({userID: OPPONENT_ID});

        // Prechecks
        await interaction.reply({
            content: `:mag: :ballot_box_with_check: :ballot_box_with_check: Conducting prechecks...`,
            ephemeral: true
        });

        if (!PROFILE) return interaction.reply({
            content: 'You do not have a profile yet! Create one with /character create',
            ephemeral: true
        });
        if (!OPPONENT_PROFILE) return interaction.reply({
            content: 'That user does not have a profile yet!',
            ephemeral: true
        });
        if (!PROFILE.characters.active) return interaction.reply({
            content: 'You do not have an active character! Set one with /character select',
            ephemeral: true
        });
        if (!OPPONENT_PROFILE.characters[CHARACTER]) return interaction.reply({
            content: 'That user does not have that character!',
            ephemeral: true
        });

        await interaction.editReply({
            content: `:white_check_mark::ballot_box_with_check::ballot_box_with_check: Prechecks passed, setting up fight...`,
            ephemeral: true
        });

        const
            FIGHT = await FIGHT_MODEL.findOne({userID: USER_ID}),
            OPPONENT_FIGHT = await FIGHT_MODEL.findOne({userID: OPPONENT_ID});

        if (FIGHT) return interaction.reply({
            content: 'You are already in a fight!',
            ephemeral: true
        });
        if (OPPONENT_FIGHT) return interaction.reply({
            content: 'That user is already in a fight!',
            ephemeral: true
        });

        const
            COMBAT_ID = `${USER_ID}-${OPPONENT_ID}-${Date.now()}`,
            PLAYER1 = {
                userID: USER_ID,
                character: PROFILE.characters[PROFILE.characters.active],
            },
            PLAYER2 = {
                userID: OPPONENT_ID,
                character: OPPONENT_PROFILE.characters[CHARACTER],
            },
            FIGHT_DATA = {
                combatID: COMBAT_ID,
                player1: PLAYER1,
                player2: PLAYER2,
                turn: interaction.user.id.toString(),
                winner: null,
                loser: null,
                p1hp: 100,
                p2hp: 100,
                history: [],
                p1turn: true,
                p2turn: false
            },
            NEW_FIGHT = new FIGHT_MODEL(FIGHT_DATA);

        await NEW_FIGHT.save();

        // Send the reply and create a thread
        const
            THREAD = await interaction.channel.threads.create({
                name: `Fight: ${PLAYER1.character.name} Vs. ${PLAYER2.character.name}`,
                autoArchiveDuration: 60,
                reason: 'Fight thread'
            }),
            THREAD_ID = THREAD.id;

        // add both players to the thread
        await THREAD.members.add(USER_ID);
        await THREAD.members.add(OPPONENT_ID);

        // Create buttons for fight moves
        const
            RANK_1 = new DISCORD.ActionRowBuilder(),
            RANK_2 = new DISCORD.ActionRowBuilder(),
            RANK_3 = new DISCORD.ActionRowBuilder();

        const
            RANK_1_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 1')
                    .setCustomId('f:rank_1')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),

                new DISCORD.ButtonBuilder()
                    .setCustomId(`f:basic_bite&?f=${COMBAT_ID}`)
                    .setLabel('Basic Bite')
                    .setStyle(DISCORD.ButtonStyle.Secondary),

                new DISCORD.ButtonBuilder()
                    .setCustomId(`f:basic_claw&?f=${COMBAT_ID}`)
                    .setLabel('Basic Claw')
                    .setStyle(DISCORD.ButtonStyle.Secondary)
            ],
            RANK_2_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 2')
                    .setCustomId('f:rank_2')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
                new DISCORD.ButtonBuilder()
                    .setCustomId(`f:tackle&?f=${COMBAT_ID}`)
                    .setLabel('Tackle')
                    .setStyle(DISCORD.ButtonStyle.Secondary),
                new DISCORD.ButtonBuilder()
                    .setCustomId(`f:throw&?f=${COMBAT_ID}`)
                    .setLabel('Throw')
                    .setStyle(DISCORD.ButtonStyle.Secondary)
            ],
            RANK_3_BUTTONS = [

                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 3')
                    .setCustomId('f:rank_3')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),

                new DISCORD.ButtonBuilder()
                    .setCustomId(`f:biteshake&?f=${COMBAT_ID}`)
                    .setLabel('Bite \'n\' Shake')
                    .setStyle(DISCORD.ButtonStyle.Secondary)
            ]

        RANK_1.addComponents(RANK_1_BUTTONS);
        RANK_2.addComponents(RANK_2_BUTTONS);
        RANK_3.addComponents(RANK_3_BUTTONS);

        await interaction.editReply({
            content: `:white_check_mark::white_check_mark::ballot_box_with_check: Setting up buttons...`,
            ephemeral: true
        })

        // Send the fight embed
        const
            EMBED = new DISCORD.EmbedBuilder()
                .setTitle(`Fight: ${PLAYER1.character.name} and ${PLAYER2.character.name}`)
                .setDescription(`Fight started between <@${USER_ID}>'s ${PLAYER1.character.name} and <@${OPPONENT_ID}>'s ${PLAYER2.character.name}\n# History
                - No history yet`)
                .setTimestamp();

        EMBED.addFields(
            {name: `${PLAYER1.character.name} HP`, value: `${FIGHT_DATA.p1hp}/100`, inline: true},
            {name: `${PLAYER2.character.name} HP`, value: `${FIGHT_DATA.p2hp}/100`, inline: true},
            {name: `Turn`, value: `It's <@${USER_ID}>'s turn (${PLAYER1.character.name})`, inline: true},
        );

        // Link to the thread
        await interaction.editReply({
            content: `Created a thread for the fight: <#${THREAD_ID}>`,
            ephemeral: true
        });

        await THREAD.send(`<@${USER_ID}> challenged <@${OPPONENT_ID}> to a fight!`);
        return THREAD.send({embeds: [EMBED], components: [RANK_1, RANK_2, RANK_3]});
    }
}
